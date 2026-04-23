using Atlas.Api.Domain;
using Atlas.Api.EventSourcing;
using Atlas.Api.Infrastructure;
using Dapper;
using FluentValidation;

namespace Atlas.Api.Endpoints;

public static class TaskToolEndpoints
{
    public static IEndpointRouteBuilder MapTaskToolEndpoints(this IEndpointRouteBuilder routes)
    {
        var tools = routes.MapGroup("/v1/tools").WithTags("tools");
        tools.MapPost("/task.create", CreateTask).WithName("TaskCreate");
        tools.MapPost("/task.update", UpdateTask).WithName("TaskUpdate");
        return routes;
    }

    // ─── task.create ───────────────────────────────────────────────────

    public sealed record TaskCreateRequest(
        string Spec,
        string Title,
        string Assignee,
        string? Description = null,
        string? ParentTask = null,
        IReadOnlyList<string>? Paths = null,
        string Risk = "green");

    public sealed class TaskCreateValidator : AbstractValidator<TaskCreateRequest>
    {
        public TaskCreateValidator()
        {
            RuleFor(r => r.Spec).NotEmpty().Matches("^spec_[A-Za-z0-9_-]+$");
            RuleFor(r => r.Title).NotEmpty().MaximumLength(200);
            RuleFor(r => r.Assignee).NotEmpty().Matches("^usr_[A-Za-z0-9_-]+$");
            RuleFor(r => r.Risk).Must(v => v is "green" or "amber" or "red")
                .WithMessage("risk must be green|amber|red");
        }
    }

    private static async Task<IResult> CreateTask(
        TaskCreateRequest req,
        IValidator<TaskCreateRequest> validator,
        IAtlasConnectionFactory factory,
        IEventLog eventLog,
        TaskProjection projection,
        HttpContext http,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(req, ct);
        if (!validation.IsValid)
            return BadRequest("E_SCHEMA_MISMATCH", string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)));

        using var conn = factory.Open();
        using var tx = conn.BeginTransaction();

        // Verify spec exists AND is not readiness-gated.
        var spec = await conn.QuerySingleOrDefaultAsync<(string workspace, bool gated)>(new CommandDefinition("""
            SELECT workspace, (readiness_breakdown->>'gated')::boolean AS gated
            FROM spec WHERE id = @id;
            """, new { id = req.Spec }, transaction: tx, cancellationToken: ct));

        if (spec.workspace is null)
            return NotFound($"spec {req.Spec} not found");

        if (spec.gated)
            return PolicyDenied("cannot spawn tasks on a gated spec (readiness below threshold)");

        // Phase 2: no auth yet. Default to the spec's owner as the acting
        // human so FK constraints on approved_by always resolve. Phase 3
        // replaces this with the OAuth subject claim.
        var specOwner = await conn.ExecuteScalarAsync<string>(new CommandDefinition(
            "SELECT owner FROM spec WHERE id = @id;",
            new { id = req.Spec }, transaction: tx, cancellationToken: ct));
        var actor = http.User.Identity?.Name ?? specOwner ?? "usr_dev";
        var actorKind = actor.StartsWith("agt_") ? "agent" : "human";
        var taskId = $"task_{Guid.NewGuid():N}"[..12];

        var created = new TaskCreated(
            Workspace: spec.workspace,
            ParentSpec: req.Spec,
            ParentTask: req.ParentTask,
            Title: req.Title,
            Description: req.Description,
            Assignee: req.Assignee,
            ProposedBy: actor,
            // Humans auto-approve. Agent-proposed tasks (Phase 3+) require
            // a separate task.approve call.
            ApprovedBy: actorKind == "human" ? actor : null,
            Paths: req.Paths ?? [],
            Risk: req.Risk);

        await eventLog.AppendAsync(conn, tx,
            aggregateType: "task", aggregateId: taskId,
            kind: TaskEventKinds.Created, payload: created,
            actor: actor, actorKind: actorKind, ct: ct);

        await projection.CreateAsync(conn, tx, taskId, created, ct);

        // Echo the newly-created row.
        var row = await conn.QuerySingleAsync<object>(new CommandDefinition(
            "SELECT row_to_json(t) FROM task t WHERE id = @id;",
            new { id = taskId }, transaction: tx, cancellationToken: ct));

        tx.Commit();
        return Results.Created($"/v1/tasks/{taskId}", new { id = taskId });
    }

    // ─── task.update ───────────────────────────────────────────────────

    public sealed record TaskUpdateRequest(
        string Task,
        string? Status = null,
        string? Title = null,
        string? Description = null,
        string? Assignee = null,
        IReadOnlyList<string>? Paths = null,
        string? Risk = null);

    public sealed class TaskUpdateValidator : AbstractValidator<TaskUpdateRequest>
    {
        public TaskUpdateValidator()
        {
            RuleFor(r => r.Task).NotEmpty().Matches("^task_[A-Za-z0-9_-]+$");
            RuleFor(r => r.Status!).Must(s => s is null || TaskStateMachine.All.Contains(s))
                .WithMessage("unknown status");
            RuleFor(r => r.Title!).MaximumLength(200).When(r => r.Title is not null);
            RuleFor(r => r.Risk!).Must(r => r is "green" or "amber" or "red")
                .When(r => r.Risk is not null);
        }
    }

    private static async Task<IResult> UpdateTask(
        TaskUpdateRequest req,
        IValidator<TaskUpdateRequest> validator,
        IAtlasConnectionFactory factory,
        IEventLog eventLog,
        TaskProjection projection,
        HttpContext http,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(req, ct);
        if (!validation.IsValid)
            return BadRequest("E_SCHEMA_MISMATCH", string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)));

        using var conn = factory.Open();
        using var tx = conn.BeginTransaction();

        var row = await conn.QuerySingleOrDefaultAsync<(string status, string? approved_by)>(new CommandDefinition(
            "SELECT status, approved_by FROM task WHERE id = @id;",
            new { id = req.Task }, transaction: tx, cancellationToken: ct));

        if (row.status is null)
            return NotFound($"task {req.Task} not found");

        var actor = http.User.Identity?.Name ?? "usr_dev";
        var actorKind = actor.StartsWith("agt_") ? "agent" : "human";

        // Status change with state-machine guard.
        if (req.Status is not null && req.Status != row.status)
        {
            if (!TaskStateMachine.CanTransition(row.status, req.Status))
                return PolicyDenied($"illegal transition {row.status} → {req.Status}");

            var evt = new TaskStatusChanged(From: row.status, To: req.Status);
            await eventLog.AppendAsync(conn, tx, "task", req.Task, TaskEventKinds.StatusChanged, evt, actor, actorKind, ct: ct);
            await projection.ApplyAsync(conn, tx, req.Task, TaskEventKinds.StatusChanged, evt, ct);
        }

        if (req.Title is not null)
        {
            var evt = new TaskRetitled(Title: req.Title);
            await eventLog.AppendAsync(conn, tx, "task", req.Task, TaskEventKinds.Retitled, evt, actor, actorKind, ct: ct);
            await projection.ApplyAsync(conn, tx, req.Task, TaskEventKinds.Retitled, evt, ct);
        }

        if (req.Description is not null)
        {
            var evt = new TaskDescriptionEdited(Description: req.Description);
            await eventLog.AppendAsync(conn, tx, "task", req.Task, TaskEventKinds.DescriptionEdited, evt, actor, actorKind, ct: ct);
            await projection.ApplyAsync(conn, tx, req.Task, TaskEventKinds.DescriptionEdited, evt, ct);
        }

        if (req.Assignee is not null)
        {
            var evt = new TaskAssigneeChanged(Assignee: req.Assignee);
            await eventLog.AppendAsync(conn, tx, "task", req.Task, TaskEventKinds.AssigneeChanged, evt, actor, actorKind, ct: ct);
            await projection.ApplyAsync(conn, tx, req.Task, TaskEventKinds.AssigneeChanged, evt, ct);
        }

        if (req.Paths is not null)
        {
            var evt = new TaskPathsChanged(Paths: req.Paths);
            await eventLog.AppendAsync(conn, tx, "task", req.Task, TaskEventKinds.PathsChanged, evt, actor, actorKind, ct: ct);
            await projection.ApplyAsync(conn, tx, req.Task, TaskEventKinds.PathsChanged, evt, ct);
        }

        if (req.Risk is not null)
        {
            var evt = new TaskRiskChanged(Risk: req.Risk);
            await eventLog.AppendAsync(conn, tx, "task", req.Task, TaskEventKinds.RiskChanged, evt, actor, actorKind, ct: ct);
            await projection.ApplyAsync(conn, tx, req.Task, TaskEventKinds.RiskChanged, evt, ct);
        }

        tx.Commit();
        return Results.Ok(new { id = req.Task });
    }

    // ─── error helpers ────────────────────────────────────────────────

    private static IResult BadRequest(string code, string message) =>
        Results.BadRequest(new { error = new { code, message, retryable = false } });

    private static IResult NotFound(string message) =>
        Results.NotFound(new { error = new { code = "E_NOT_FOUND", message, retryable = false } });

    private static IResult PolicyDenied(string message) =>
        Results.Json(new { error = new { code = "E_POLICY_DENIED", message, retryable = false } }, statusCode: 403);
}
