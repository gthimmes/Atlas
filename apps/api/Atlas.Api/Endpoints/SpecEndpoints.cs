using System.Text.Json;
using Atlas.Api.Domain;
using Atlas.Api.Infrastructure;
using Atlas.Api.Sse;
using Dapper;
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
        var rows = await conn.QueryAsync<SpecRow>(new CommandDefinition($"""
            {SpecRow.SelectColumns}
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
        var row = await conn.QuerySingleOrDefaultAsync<SpecRow>(new CommandDefinition(
            $"{SpecRow.SelectColumns} WHERE id = @id;",
            new { id }, cancellationToken: ct));

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
        SpecEditService service,
        HttpContext http,
        CancellationToken ct)
    {
        var outcome = await service.ProposeEditAsync(req, http.User.Identity?.Name, ct);
        return outcome.IsOk
            ? Results.Ok(outcome.Value)
            : Results.Json(
                new { error = new { code = outcome.Error!.Code, message = outcome.Error.Message, retryable = outcome.Error.Retryable } },
                statusCode: outcome.Error.HttpStatus);
    }
}
