using Atlas.Api.Infrastructure;
using Dapper;

namespace Atlas.Api.Endpoints;

public static class TaskEndpoints
{
    public static IEndpointRouteBuilder MapTaskEndpoints(this IEndpointRouteBuilder routes)
    {
        var tasks = routes.MapGroup("/v1/tasks").WithTags("tasks");
        tasks.MapGet("/", ListTasks).WithName("ListTasks");
        tasks.MapGet("/{id}", GetTask).WithName("GetTask");
        return routes;
    }

    private static async Task<IResult> ListTasks(
        IAtlasConnectionFactory factory,
        string? spec,
        string? status,
        CancellationToken ct)
    {
        using var conn = factory.Open();
        var rows = await conn.QueryAsync<TaskRow>(new CommandDefinition("""
            SELECT id, workspace, parent_spec, parent_task, title, description, status,
                   assignee, delegated_to, delegation_history::text AS delegation_history,
                   blocks::text AS blocks, blocked_by::text AS blocked_by,
                   context_bundle_override, agent_budget::text AS agent_budget, risk,
                   paths::text AS paths, proposed_by, approved_by,
                   created_at, updated_at, completed_at
            FROM task
            WHERE (@spec::text IS NULL OR parent_spec = @spec)
              AND (@status::text IS NULL OR status = @status)
            ORDER BY created_at
            LIMIT 500;
            """, new { spec, status }, cancellationToken: ct));

        return Results.Ok(new { items = rows.Select(r => r.Materialize()).ToList(), next_cursor = (string?)null });
    }

    private static async Task<IResult> GetTask(
        string id,
        IAtlasConnectionFactory factory,
        CancellationToken ct)
    {
        using var conn = factory.Open();
        var row = await conn.QuerySingleOrDefaultAsync<TaskRow>(new CommandDefinition("""
            SELECT id, workspace, parent_spec, parent_task, title, description, status,
                   assignee, delegated_to, delegation_history::text AS delegation_history,
                   blocks::text AS blocks, blocked_by::text AS blocked_by,
                   context_bundle_override, agent_budget::text AS agent_budget, risk,
                   paths::text AS paths, proposed_by, approved_by,
                   created_at, updated_at, completed_at
            FROM task WHERE id = @id;
            """, new { id }, cancellationToken: ct));
        return row is null
            ? Results.NotFound(new { error = new { code = "E_NOT_FOUND", message = $"task {id} not found", retryable = false } })
            : Results.Ok(row.Materialize());
    }
}

internal sealed record TaskRow
{
    public string id { get; init; } = default!;
    public string workspace { get; init; } = default!;
    public string parent_spec { get; init; } = default!;
    public string? parent_task { get; init; }
    public string title { get; init; } = default!;
    public string? description { get; init; }
    public string status { get; init; } = default!;
    public string assignee { get; init; } = default!;
    public string? delegated_to { get; init; }
    public string delegation_history { get; init; } = "[]";
    public string blocks { get; init; } = "[]";
    public string blocked_by { get; init; } = "[]";
    public string? context_bundle_override { get; init; }
    public string? agent_budget { get; init; }
    public string risk { get; init; } = "green";
    public string paths { get; init; } = "[]";
    public string proposed_by { get; init; } = default!;
    public string? approved_by { get; init; }
    public DateTimeOffset created_at { get; init; }
    public DateTimeOffset updated_at { get; init; }
    public DateTimeOffset? completed_at { get; init; }

    public object Materialize() => new
    {
        id,
        workspace,
        parent_spec,
        parent_task,
        title,
        description,
        status,
        assignee,
        delegated_to,
        delegation_history = System.Text.Json.JsonDocument.Parse(delegation_history).RootElement.Clone(),
        blocks = System.Text.Json.JsonDocument.Parse(blocks).RootElement.Clone(),
        blocked_by = System.Text.Json.JsonDocument.Parse(blocked_by).RootElement.Clone(),
        context_bundle_override,
        agent_budget = agent_budget is null ? (object?)null : System.Text.Json.JsonDocument.Parse(agent_budget).RootElement.Clone(),
        risk,
        paths = System.Text.Json.JsonDocument.Parse(paths).RootElement.Clone(),
        proposed_by,
        approved_by,
        created_at,
        updated_at,
        completed_at,
    };
}
