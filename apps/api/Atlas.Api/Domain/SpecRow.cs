using System.Text.Json;

namespace Atlas.Api.Domain;

// Dapper row for the spec read model + JSON materialization. Lives in
// Domain (not Endpoints) because both the HTTP and MCP surfaces return it.
internal sealed record SpecRow
{
    public const string SelectColumns = """
        SELECT id, workspace, project, pitch, parent_spec, title, slug, status, version, head_sha,
               intent, non_goals::text AS non_goals, constraints::text AS constraints,
               acceptance::text AS acceptance, decisions::text AS decisions,
               open_questions::text AS open_questions, context_bundle,
               readiness_score, readiness_breakdown::text AS readiness_breakdown,
               task_ids::text AS task_ids, actor_summary::text AS actor_summary,
               repo_path, owner, created_at, created_by, updated_at, shipped_at
        FROM spec
        """;

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
