using System.Text.Json;
using Atlas.Api.EventSourcing;
using Atlas.Api.Infrastructure;
using Atlas.Api.Readiness;
using Atlas.Api.Sse;
using Dapper;
using FluentValidation;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.Options;

namespace Atlas.Api.Endpoints;

public static class SpecEndpoints
{
    public static IEndpointRouteBuilder MapSpecEndpoints(this IEndpointRouteBuilder routes)
    {
        var specs = routes.MapGroup("/v1/specs").WithTags("specs");

        specs.MapGet("/", ListSpecs).WithName("ListSpecs");
        specs.MapGet("/{id}", GetSpec).WithName("GetSpec");
        specs.MapGet("/{id}/readiness", GetOrStreamReadiness).WithName("GetReadiness");

        var tools = routes.MapGroup("/v1/tools").WithTags("tools");
        tools.MapPost("/spec.propose_edit", ProposeSpecEdit).WithName("SpecProposeEdit");

        return routes;
    }

    // ─── GET /v1/specs ──────────────────────────────────────────────────

    private static async Task<IResult> ListSpecs(
        IAtlasConnectionFactory factory,
        IOptions<JsonOptions> json,
        string? project,
        string? status,
        CancellationToken ct)
    {
        using var conn = factory.Open();
        var rows = await conn.QueryAsync<SpecRow>(new CommandDefinition("""
            SELECT id, workspace, project, pitch, parent_spec, title, slug, status, version, head_sha,
                   intent, non_goals::text AS non_goals, constraints::text AS constraints,
                   acceptance::text AS acceptance, decisions::text AS decisions,
                   open_questions::text AS open_questions, context_bundle,
                   readiness_score, readiness_breakdown::text AS readiness_breakdown,
                   task_ids::text AS task_ids, actor_summary::text AS actor_summary,
                   repo_path, owner, created_at, created_by, updated_at, shipped_at
            FROM spec
            WHERE (@project::text IS NULL OR project = @project)
              AND (@status::text IS NULL OR status = @status)
            ORDER BY updated_at DESC
            LIMIT 200;
            """, new { project, status }, cancellationToken: ct));

        var items = rows.Select(r => r.Materialize(json.Value.SerializerOptions)).ToList();
        return Results.Ok(new { items, next_cursor = (string?)null });
    }

    // ─── GET /v1/specs/{id} ─────────────────────────────────────────────

    private static async Task<IResult> GetSpec(
        string id,
        IAtlasConnectionFactory factory,
        IOptions<JsonOptions> json,
        CancellationToken ct)
    {
        using var conn = factory.Open();
        var row = await conn.QuerySingleOrDefaultAsync<SpecRow>(new CommandDefinition("""
            SELECT id, workspace, project, pitch, parent_spec, title, slug, status, version, head_sha,
                   intent, non_goals::text AS non_goals, constraints::text AS constraints,
                   acceptance::text AS acceptance, decisions::text AS decisions,
                   open_questions::text AS open_questions, context_bundle,
                   readiness_score, readiness_breakdown::text AS readiness_breakdown,
                   task_ids::text AS task_ids, actor_summary::text AS actor_summary,
                   repo_path, owner, created_at, created_by, updated_at, shipped_at
            FROM spec WHERE id = @id;
            """, new { id }, cancellationToken: ct));

        return row is null
            ? Results.NotFound(new { error = new { code = "E_NOT_FOUND", message = $"spec {id} not found", retryable = false } })
            : Results.Ok(row.Materialize(json.Value.SerializerOptions));
    }

    // ─── GET /v1/specs/{id}/readiness + SSE subscribe ───────────────────

    private static async Task GetOrStreamReadiness(
        HttpContext http,
        string id,
        IAtlasConnectionFactory factory,
        IOptions<JsonOptions> json,
        ISpecReadinessHub hub,
        CancellationToken ct)
    {
        var acceptsStream = http.Request.Headers.Accept.Any(v =>
            v != null && v.Contains("text/event-stream", StringComparison.Ordinal));

        if (!acceptsStream)
        {
            using var conn = factory.Open();
            var raw = await conn.QuerySingleOrDefaultAsync<string>(new CommandDefinition(
                "SELECT readiness_breakdown::text FROM spec WHERE id = @id",
                new { id }, cancellationToken: ct));
            if (raw is null)
            {
                http.Response.StatusCode = 404;
                return;
            }
            http.Response.ContentType = "application/json";
            await http.Response.WriteAsync(raw, ct);
            return;
        }

        http.Response.Headers.CacheControl = "no-cache, no-transform";
        http.Response.Headers.Append("X-Accel-Buffering", "no");
        http.Response.ContentType = "text/event-stream";

        // Emit current state once so the client has a value immediately.
        using (var conn = factory.Open())
        {
            var raw = await conn.QuerySingleOrDefaultAsync<(long? id, string? breakdown)>(new CommandDefinition("""
                SELECT
                  (SELECT COALESCE(MAX(id), 0) FROM event_log WHERE aggregate_type='spec' AND aggregate_id=@id) AS id,
                  (SELECT readiness_breakdown::text FROM spec WHERE id = @id) AS breakdown
                """, new { id }, cancellationToken: ct));
            if (raw.breakdown is not null)
                await WriteSseAsync(http, raw.id ?? 0, "readiness.updated", raw.breakdown, ct);
        }

        await foreach (var env in hub.SubscribeAsync(id, ct))
        {
            var payload = JsonSerializer.Serialize(env.Breakdown, json.Value.SerializerOptions);
            await WriteSseAsync(http, env.EventLogId, "readiness.updated", payload, ct);
        }
    }

    private static async Task WriteSseAsync(HttpContext http, long eventId, string eventName, string dataJson, CancellationToken ct)
    {
        await http.Response.WriteAsync($"id: {eventId}\nevent: {eventName}\ndata: {dataJson}\n\n", ct);
        await http.Response.Body.FlushAsync(ct);
    }

    // ─── POST /v1/tools/spec.propose_edit ───────────────────────────────

    private static async Task<IResult> ProposeSpecEdit(
        ProposeSpecEditRequest req,
        IValidator<ProposeSpecEditRequest> validator,
        IAtlasConnectionFactory factory,
        IEventLog eventLog,
        SpecProjection projection,
        ISpecReadinessHub hub,
        IOptions<JsonOptions> json,
        HttpContext http,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(req, ct);
        if (!validation.IsValid)
        {
            return Results.BadRequest(new
            {
                error = new
                {
                    code = "E_SCHEMA_MISMATCH",
                    message = string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)),
                    retryable = false,
                }
            });
        }

        // Map (section, patch) → event kind + strongly-typed payload.
        var (kind, payload) = req.Section switch
        {
            "intent" => (SpecEventKinds.IntentEdited, (object)new SpecIntentEdited(req.Patch.TryGetProperty("intent", out var i) && i.ValueKind != JsonValueKind.Null ? i.GetString() : null)),
            "non_goals" => (SpecEventKinds.NonGoalsEdited, (object)new SpecNonGoalsEdited(req.Patch.GetProperty("non_goals").EnumerateArray().Select(e => e.GetString() ?? "").ToList())),
            "constraints" => (SpecEventKinds.ConstraintsEdited, (object)new SpecConstraintsEdited(req.Patch.GetProperty("constraints"))),
            "acceptance" => (SpecEventKinds.AcceptanceEdited, (object)new SpecAcceptanceEdited(req.Patch.GetProperty("acceptance"))),
            "decisions" => (SpecEventKinds.DecisionsEdited, (object)new SpecDecisionsEdited(req.Patch.GetProperty("decisions").EnumerateArray().Select(e => e.GetString() ?? "").ToList())),
            "open_questions" => (SpecEventKinds.OpenQuestionsEdited, (object)new SpecOpenQuestionsEdited(req.Patch.GetProperty("open_questions"))),
            "context_bundle" => (SpecEventKinds.ContextBundleEdited, (object)new SpecContextBundleEdited(req.Patch.TryGetProperty("context_bundle", out var b) && b.ValueKind != JsonValueKind.Null ? b.GetString() : null)),
            _ => throw new InvalidOperationException($"unknown section: {req.Section}"),
        };

        var actor = http.User.Identity?.Name ?? "usr_dev";
        var actorKind = actor.StartsWith("agt_") ? "agent" : "human";

        using var conn = factory.Open();
        using var tx = conn.BeginTransaction();

        // Verify the spec exists before writing.
        var exists = await conn.ExecuteScalarAsync<int>(new CommandDefinition(
            "SELECT 1 FROM spec WHERE id = @id", new { id = req.Spec }, transaction: tx, cancellationToken: ct));
        if (exists != 1)
        {
            return Results.NotFound(new { error = new { code = "E_NOT_FOUND", message = $"spec {req.Spec} not found", retryable = false } });
        }

        var eventId = await eventLog.AppendAsync(conn, tx,
            aggregateType: "spec",
            aggregateId: req.Spec,
            kind: kind,
            payload: payload,
            actor: actor,
            actorKind: actorKind,
            ct: ct);

        await projection.ApplyAsync(conn, tx, req.Spec, kind, payload, actor, ct);

        // Read the freshly-projected spec so we can return it + publish the readiness envelope.
        var specRow = await conn.QuerySingleAsync<SpecRow>(new CommandDefinition("""
            SELECT id, workspace, project, pitch, parent_spec, title, slug, status, version, head_sha,
                   intent, non_goals::text AS non_goals, constraints::text AS constraints,
                   acceptance::text AS acceptance, decisions::text AS decisions,
                   open_questions::text AS open_questions, context_bundle,
                   readiness_score, readiness_breakdown::text AS readiness_breakdown,
                   task_ids::text AS task_ids, actor_summary::text AS actor_summary,
                   repo_path, owner, created_at, created_by, updated_at, shipped_at
            FROM spec WHERE id = @id;
            """, new { id = req.Spec }, transaction: tx, cancellationToken: ct));

        tx.Commit();

        // Fan out readiness update (after commit so subscribers see the durable state).
        var breakdown = JsonSerializer.Deserialize<ReadinessBreakdown>(specRow.readiness_breakdown, json.Value.SerializerOptions)!;
        await hub.PublishAsync(req.Spec, eventId, breakdown, ct);

        return Results.Ok(specRow.Materialize(json.Value.SerializerOptions));
    }
}

public sealed record ProposeSpecEditRequest(string Spec, string Section, JsonElement Patch);

public sealed class ProposeSpecEditValidator : AbstractValidator<ProposeSpecEditRequest>
{
    private static readonly string[] AllowedSections =
        ["intent", "non_goals", "constraints", "acceptance", "decisions", "open_questions", "context_bundle"];

    public ProposeSpecEditValidator()
    {
        RuleFor(r => r.Spec).NotEmpty().Matches("^spec_[a-zA-Z0-9_-]+$");
        RuleFor(r => r.Section).NotEmpty().Must(AllowedSections.Contains)
            .WithMessage($"section must be one of: {string.Join(", ", AllowedSections)}");
        RuleFor(r => r.Patch).NotNull();
    }
}

// ─── Dapper row + materialization ───────────────────────────────────────

internal sealed record SpecRow
{
    public string id { get; init; } = default!;
    public string workspace { get; init; } = default!;
    public string project { get; init; } = default!;
    public string? pitch { get; init; }
    public string? parent_spec { get; init; }
    public string title { get; init; } = default!;
    public string slug { get; init; } = default!;
    public string status { get; init; } = default!;
    public int version { get; init; }
    public string head_sha { get; init; } = default!;
    public string? intent { get; init; }
    public string non_goals { get; init; } = "[]";
    public string constraints { get; init; } = "[]";
    public string acceptance { get; init; } = "[]";
    public string decisions { get; init; } = "[]";
    public string open_questions { get; init; } = "[]";
    public string? context_bundle { get; init; }
    public int readiness_score { get; init; }
    public string readiness_breakdown { get; init; } = "{}";
    public string task_ids { get; init; } = "[]";
    public string actor_summary { get; init; } = "{}";
    public string? repo_path { get; init; }
    public string owner { get; init; } = default!;
    public DateTimeOffset created_at { get; init; }
    public string created_by { get; init; } = default!;
    public DateTimeOffset updated_at { get; init; }
    public DateTimeOffset? shipped_at { get; init; }

    public object Materialize(JsonSerializerOptions opts) => new
    {
        id,
        workspace,
        project,
        pitch,
        parent_spec,
        title,
        slug,
        status,
        version,
        head_sha,
        intent,
        non_goals = JsonDocument.Parse(non_goals).RootElement.Clone(),
        constraints = JsonDocument.Parse(constraints).RootElement.Clone(),
        acceptance = JsonDocument.Parse(acceptance).RootElement.Clone(),
        decisions = JsonDocument.Parse(decisions).RootElement.Clone(),
        open_questions = JsonDocument.Parse(open_questions).RootElement.Clone(),
        context_bundle,
        readiness_score,
        readiness_breakdown = JsonDocument.Parse(readiness_breakdown).RootElement.Clone(),
        task_ids = JsonDocument.Parse(task_ids).RootElement.Clone(),
        actor_summary = JsonDocument.Parse(actor_summary).RootElement.Clone(),
        repo_path,
        owner,
        created_at,
        created_by,
        updated_at,
        shipped_at,
    };
}
