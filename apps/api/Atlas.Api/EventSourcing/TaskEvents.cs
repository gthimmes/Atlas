using System.Text.Json.Serialization;

namespace Atlas.Api.EventSourcing;

// Event payload vocabulary for the `task` aggregate.

public static class TaskEventKinds
{
    public const string Created = "task.created";
    public const string StatusChanged = "task.status_changed";
    public const string Retitled = "task.retitled";
    public const string DescriptionEdited = "task.description_edited";
    public const string AssigneeChanged = "task.assignee_changed";
    public const string PathsChanged = "task.paths_changed";
    public const string BlocksChanged = "task.blocks_changed";
    public const string RiskChanged = "task.risk_changed";
    public const string Approved = "task.approved";
}

public sealed record TaskCreated(
    [property: JsonPropertyName("workspace")] string Workspace,
    [property: JsonPropertyName("parent_spec")] string ParentSpec,
    [property: JsonPropertyName("parent_task")] string? ParentTask,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("assignee")] string Assignee,
    [property: JsonPropertyName("proposed_by")] string ProposedBy,
    [property: JsonPropertyName("approved_by")] string? ApprovedBy,
    [property: JsonPropertyName("paths")] IReadOnlyList<string> Paths,
    [property: JsonPropertyName("risk")] string Risk);

public sealed record TaskStatusChanged(
    [property: JsonPropertyName("from")] string From,
    [property: JsonPropertyName("to")] string To);

public sealed record TaskRetitled(
    [property: JsonPropertyName("title")] string Title);

public sealed record TaskDescriptionEdited(
    [property: JsonPropertyName("description")] string? Description);

public sealed record TaskAssigneeChanged(
    [property: JsonPropertyName("assignee")] string Assignee);

public sealed record TaskPathsChanged(
    [property: JsonPropertyName("paths")] IReadOnlyList<string> Paths);

public sealed record TaskBlocksChanged(
    [property: JsonPropertyName("blocks")] IReadOnlyList<string> Blocks,
    [property: JsonPropertyName("blocked_by")] IReadOnlyList<string> BlockedBy);

public sealed record TaskRiskChanged(
    [property: JsonPropertyName("risk")] string Risk);

public sealed record TaskApproved(
    [property: JsonPropertyName("approved_by")] string ApprovedBy);
