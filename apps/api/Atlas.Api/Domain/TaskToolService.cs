using Atlas.Api.EventSourcing;
using Atlas.Api.Infrastructure;
using Dapper;
using FluentValidation;

namespace Atlas.Api.Domain;

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

/// <summary>
/// task.create / task.update — one code path for the HTTP tool endpoints
/// and the MCP tools. Enforces the readiness gate on create and the
/// legal-transition state machine on update.
/// </summary>
public sealed class TaskToolService(
    IAtlasConnectionFactory factory,
    IEventLog eventLog,
    TaskProjection projection,
    IValidator<TaskCreateRequest> createValidator,
    IValidator<TaskUpdateRequest> updateValidator)
{
    public async Task<ToolOutcome<string>> CreateAsync(TaskCreateRequest req, string? actor, CancellationToken ct)
    {
        var validation = await createValidator.ValidateAsync(req, ct);
        if (!validation.IsValid)
            return ToolOutcome<string>.Fail("E_SCHEMA_MISMATCH",
                string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)));

        using var conn = factory.Open();
        using var tx = conn.BeginTransaction();

        // Verify spec exists AND is not readiness-gated.
        var spec = await conn.QuerySingleOrDefaultAsync<(string workspace, bool gated)>(new CommandDefinition("""
            SELECT workspace, (readiness_breakdown->>'gated')::boolean AS gated
            FROM spec WHERE id = @id;
            """, new { id = req.Spec }, transaction: tx, cancellationToken: ct));

        if (spec.workspace is null)
            return ToolOutcome<string>.Fail("E_NOT_FOUND", $"spec {req.Spec} not found");

        if (spec.gated)
            return ToolOutcome<string>.Fail("E_POLICY_DENIED",
                "cannot spawn tasks on a gated spec (readiness below threshold)");

        // Unauthenticated dev calls default to the spec's owner as the acting
        // human so FK constraints on approved_by always resolve. Agent calls
        // (MCP) arrive with an agt_* actor from the token principal.
        string? resolvedActor = actor;
        if (resolvedActor is null)
        {
            var specOwner = await conn.ExecuteScalarAsync<string>(new CommandDefinition(
                "SELECT owner FROM spec WHERE id = @id;",
                new { id = req.Spec }, transaction: tx, cancellationToken: ct));
            resolvedActor = specOwner ?? "usr_dev";
        }
        var actorKind = resolvedActor.StartsWith("agt_") ? "agent" : "human";
        var taskId = $"task_{Guid.NewGuid():N}"[..12];

        var created = new TaskCreated(
            Workspace: spec.workspace,
            ParentSpec: req.Spec,
            ParentTask: req.ParentTask,
            Title: req.Title,
            Description: req.Description,
            Assignee: req.Assignee,
            ProposedBy: resolvedActor,
            // Humans auto-approve. Agent-proposed tasks require a separate
            // human approval (api-contract.md: "agents require approved_by
            // after create").
            ApprovedBy: actorKind == "human" ? resolvedActor : null,
            Paths: req.Paths ?? [],
            Risk: req.Risk);

        await eventLog.AppendAsync(conn, tx,
            aggregateType: "task", aggregateId: taskId,
            kind: TaskEventKinds.Created, payload: created,
            actor: resolvedActor, actorKind: actorKind, ct: ct);

        await projection.CreateAsync(conn, tx, taskId, created, ct);

        tx.Commit();
        return ToolOutcome<string>.Ok(taskId);
    }

    public async Task<ToolOutcome<string>> UpdateAsync(TaskUpdateRequest req, string? actor, CancellationToken ct)
    {
        var validation = await updateValidator.ValidateAsync(req, ct);
        if (!validation.IsValid)
            return ToolOutcome<string>.Fail("E_SCHEMA_MISMATCH",
                string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)));

        using var conn = factory.Open();
        using var tx = conn.BeginTransaction();

        var row = await conn.QuerySingleOrDefaultAsync<(string status, string? approved_by)>(new CommandDefinition(
            "SELECT status, approved_by FROM task WHERE id = @id;",
            new { id = req.Task }, transaction: tx, cancellationToken: ct));

        if (row.status is null)
            return ToolOutcome<string>.Fail("E_NOT_FOUND", $"task {req.Task} not found");

        var resolvedActor = actor ?? "usr_dev";
        var actorKind = resolvedActor.StartsWith("agt_") ? "agent" : "human";

        // Status change with state-machine guard.
        if (req.Status is not null && req.Status != row.status)
        {
            if (!TaskStateMachine.CanTransition(row.status, req.Status))
                return ToolOutcome<string>.Fail("E_POLICY_DENIED",
                    $"illegal transition {row.status} → {req.Status}");

            var evt = new TaskStatusChanged(From: row.status, To: req.Status);
            await eventLog.AppendAsync(conn, tx, "task", req.Task, TaskEventKinds.StatusChanged, evt, resolvedActor, actorKind, ct: ct);
            await projection.ApplyAsync(conn, tx, req.Task, TaskEventKinds.StatusChanged, evt, ct);
        }

        if (req.Title is not null)
        {
            var evt = new TaskRetitled(Title: req.Title);
            await eventLog.AppendAsync(conn, tx, "task", req.Task, TaskEventKinds.Retitled, evt, resolvedActor, actorKind, ct: ct);
            await projection.ApplyAsync(conn, tx, req.Task, TaskEventKinds.Retitled, evt, ct);
        }

        if (req.Description is not null)
        {
            var evt = new TaskDescriptionEdited(Description: req.Description);
            await eventLog.AppendAsync(conn, tx, "task", req.Task, TaskEventKinds.DescriptionEdited, evt, resolvedActor, actorKind, ct: ct);
            await projection.ApplyAsync(conn, tx, req.Task, TaskEventKinds.DescriptionEdited, evt, ct);
        }

        if (req.Assignee is not null)
        {
            var evt = new TaskAssigneeChanged(Assignee: req.Assignee);
            await eventLog.AppendAsync(conn, tx, "task", req.Task, TaskEventKinds.AssigneeChanged, evt, resolvedActor, actorKind, ct: ct);
            await projection.ApplyAsync(conn, tx, req.Task, TaskEventKinds.AssigneeChanged, evt, ct);
        }

        if (req.Paths is not null)
        {
            var evt = new TaskPathsChanged(Paths: req.Paths);
            await eventLog.AppendAsync(conn, tx, "task", req.Task, TaskEventKinds.PathsChanged, evt, resolvedActor, actorKind, ct: ct);
            await projection.ApplyAsync(conn, tx, req.Task, TaskEventKinds.PathsChanged, evt, ct);
        }

        if (req.Risk is not null)
        {
            var evt = new TaskRiskChanged(Risk: req.Risk);
            await eventLog.AppendAsync(conn, tx, "task", req.Task, TaskEventKinds.RiskChanged, evt, resolvedActor, actorKind, ct: ct);
            await projection.ApplyAsync(conn, tx, req.Task, TaskEventKinds.RiskChanged, evt, ct);
        }

        tx.Commit();
        return ToolOutcome<string>.Ok(req.Task);
    }
}
