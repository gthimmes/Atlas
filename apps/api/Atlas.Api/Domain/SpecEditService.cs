using System.Text.Json;
using Atlas.Api.EventSourcing;
using Atlas.Api.Infrastructure;
using Atlas.Api.Readiness;
using Atlas.Api.Sse;
using Dapper;
using FluentValidation;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.Options;

namespace Atlas.Api.Domain;

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

/// <summary>
/// spec.propose_edit — section-scoped spec mutation. One code path for the
/// HTTP tool endpoint and the MCP tool; appends the event, projects the
/// read model, and fans out the readiness envelope after commit.
/// </summary>
public sealed class SpecEditService(
    IAtlasConnectionFactory factory,
    IEventLog eventLog,
    SpecProjection projection,
    ISpecReadinessHub hub,
    IValidator<ProposeSpecEditRequest> validator,
    IOptions<JsonOptions> json)
{
    public async Task<ToolOutcome<object>> ProposeEditAsync(ProposeSpecEditRequest req, string? actor, CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(req, ct);
        if (!validation.IsValid)
            return ToolOutcome<object>.Fail("E_SCHEMA_MISMATCH",
                string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)));

        // Map (section, patch) → event kind + strongly-typed payload.
        object payload;
        string kind;
        try
        {
            (kind, payload) = req.Section switch
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
        }
        catch (KeyNotFoundException)
        {
            // Patch shape didn't match the section (e.g. {"section":"non_goals"}
            // without a non_goals property). MCP clients hit this path with
            // free-form JSON, so report it as a schema mismatch, not a 500.
            return ToolOutcome<object>.Fail("E_SCHEMA_MISMATCH",
                $"patch for section '{req.Section}' must contain a '{req.Section}' property");
        }

        var resolvedActor = actor ?? "usr_dev";
        var actorKind = resolvedActor.StartsWith("agt_") ? "agent" : "human";

        using var conn = factory.Open();
        using var tx = conn.BeginTransaction();

        // Verify the spec exists before writing.
        var exists = await conn.ExecuteScalarAsync<int>(new CommandDefinition(
            "SELECT 1 FROM spec WHERE id = @id", new { id = req.Spec }, transaction: tx, cancellationToken: ct));
        if (exists != 1)
            return ToolOutcome<object>.Fail("E_NOT_FOUND", $"spec {req.Spec} not found");

        var eventId = await eventLog.AppendAsync(conn, tx,
            aggregateType: "spec",
            aggregateId: req.Spec,
            kind: kind,
            payload: payload,
            actor: resolvedActor,
            actorKind: actorKind,
            ct: ct);

        await projection.ApplyAsync(conn, tx, req.Spec, kind, payload, resolvedActor, ct);

        // Read the freshly-projected spec so we can return it + publish the readiness envelope.
        var specRow = await conn.QuerySingleAsync<SpecRow>(new CommandDefinition(
            $"{SpecRow.SelectColumns} WHERE id = @id;",
            new { id = req.Spec }, transaction: tx, cancellationToken: ct));

        tx.Commit();

        // Fan out readiness update (after commit so subscribers see the durable state).
        var breakdown = JsonSerializer.Deserialize<ReadinessBreakdown>(specRow.readiness_breakdown, json.Value.SerializerOptions)!;
        await hub.PublishAsync(req.Spec, eventId, breakdown, ct);

        return ToolOutcome<object>.Ok(specRow.Materialize(json.Value.SerializerOptions));
    }
}
