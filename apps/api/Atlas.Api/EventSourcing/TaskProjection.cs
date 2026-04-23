using System.Data;
using System.Text.Json;
using Atlas.Api.Domain;
using Dapper;

namespace Atlas.Api.EventSourcing;

public sealed class TaskProjection(JsonSerializerOptions jsonOptions)
{
    public async Task CreateAsync(IDbConnection conn, IDbTransaction tx, string taskId, TaskCreated p, CancellationToken ct)
    {
        await conn.ExecuteAsync(new CommandDefinition("""
            INSERT INTO task (
              id, workspace, parent_spec, parent_task, title, description, status,
              assignee, delegated_to, delegation_history, blocks, blocked_by,
              context_bundle_override, agent_budget, risk, paths,
              proposed_by, approved_by, created_at, updated_at, completed_at
            ) VALUES (
              @id, @workspace, @parent_spec, @parent_task, @title, @description, @status,
              @assignee, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
              NULL, NULL, @risk, @paths::jsonb,
              @proposed_by, @approved_by, now(), now(), NULL
            );
            """, new
        {
            id = taskId,
            workspace = p.Workspace,
            parent_spec = p.ParentSpec,
            parent_task = p.ParentTask,
            title = p.Title,
            description = p.Description,
            status = TaskStateMachine.Proposed,
            assignee = p.Assignee,
            risk = p.Risk,
            paths = JsonSerializer.Serialize(p.Paths, jsonOptions),
            proposed_by = p.ProposedBy,
            approved_by = p.ApprovedBy,
        }, transaction: tx, cancellationToken: ct));

        // Append to the parent spec's task_ids for quick reads.
        await conn.ExecuteAsync(new CommandDefinition("""
            UPDATE spec
            SET task_ids = COALESCE(task_ids, '[]'::jsonb) || jsonb_build_array(@taskId)
            WHERE id = @specId;
            """, new { taskId, specId = p.ParentSpec }, transaction: tx, cancellationToken: ct));
    }

    public async Task ApplyAsync(IDbConnection conn, IDbTransaction tx, string taskId, string kind, object payload, CancellationToken ct)
    {
        await conn.ExecuteAsync(new CommandDefinition(
            "UPDATE task SET updated_at = now() WHERE id = @id;",
            new { id = taskId }, transaction: tx, cancellationToken: ct));

        switch (kind)
        {
            case TaskEventKinds.StatusChanged:
                {
                    var p = (TaskStatusChanged)payload;
                    var completedAt = p.To == TaskStateMachine.Done ? DateTimeOffset.UtcNow : (DateTimeOffset?)null;
                    await conn.ExecuteAsync(new CommandDefinition(
                        "UPDATE task SET status = @status, completed_at = @completedAt WHERE id = @id;",
                        new { id = taskId, status = p.To, completedAt }, transaction: tx, cancellationToken: ct));
                    break;
                }
            case TaskEventKinds.Retitled:
                {
                    var p = (TaskRetitled)payload;
                    await conn.ExecuteAsync(new CommandDefinition(
                        "UPDATE task SET title = @title WHERE id = @id;",
                        new { id = taskId, title = p.Title }, transaction: tx, cancellationToken: ct));
                    break;
                }
            case TaskEventKinds.DescriptionEdited:
                {
                    var p = (TaskDescriptionEdited)payload;
                    await conn.ExecuteAsync(new CommandDefinition(
                        "UPDATE task SET description = @description WHERE id = @id;",
                        new { id = taskId, description = p.Description }, transaction: tx, cancellationToken: ct));
                    break;
                }
            case TaskEventKinds.AssigneeChanged:
                {
                    var p = (TaskAssigneeChanged)payload;
                    await conn.ExecuteAsync(new CommandDefinition(
                        "UPDATE task SET assignee = @assignee WHERE id = @id;",
                        new { id = taskId, assignee = p.Assignee }, transaction: tx, cancellationToken: ct));
                    break;
                }
            case TaskEventKinds.PathsChanged:
                {
                    var p = (TaskPathsChanged)payload;
                    await conn.ExecuteAsync(new CommandDefinition(
                        "UPDATE task SET paths = @paths::jsonb WHERE id = @id;",
                        new { id = taskId, paths = JsonSerializer.Serialize(p.Paths, jsonOptions) },
                        transaction: tx, cancellationToken: ct));
                    break;
                }
            case TaskEventKinds.BlocksChanged:
                {
                    var p = (TaskBlocksChanged)payload;
                    await conn.ExecuteAsync(new CommandDefinition("""
                        UPDATE task SET blocks = @blocks::jsonb, blocked_by = @blockedBy::jsonb WHERE id = @id;
                        """, new
                    {
                        id = taskId,
                        blocks = JsonSerializer.Serialize(p.Blocks, jsonOptions),
                        blockedBy = JsonSerializer.Serialize(p.BlockedBy, jsonOptions),
                    }, transaction: tx, cancellationToken: ct));
                    break;
                }
            case TaskEventKinds.RiskChanged:
                {
                    var p = (TaskRiskChanged)payload;
                    await conn.ExecuteAsync(new CommandDefinition(
                        "UPDATE task SET risk = @risk WHERE id = @id;",
                        new { id = taskId, risk = p.Risk }, transaction: tx, cancellationToken: ct));
                    break;
                }
            case TaskEventKinds.Approved:
                {
                    var p = (TaskApproved)payload;
                    await conn.ExecuteAsync(new CommandDefinition(
                        "UPDATE task SET approved_by = @by WHERE id = @id;",
                        new { id = taskId, by = p.ApprovedBy }, transaction: tx, cancellationToken: ct));
                    break;
                }
            default:
                throw new InvalidOperationException($"unknown task event kind: {kind}");
        }
    }
}
