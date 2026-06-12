using System.ComponentModel;
using System.Text.Json;
using Atlas.Api.Domain;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.Options;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace Atlas.Api.Mcp;

/// <summary>
/// MCP `tools/call` surface (api-contract.md §Tools). Thin adapters over
/// the same domain services that back POST /v1/tools/* — policy lives in
/// the services, never here. The acting agent comes from the bearer-token
/// principal, so every event these tools append is attributed agt_*.
/// </summary>
[McpServerToolType]
public sealed class AtlasMcpTools
{
    [McpServerTool(Name = "spec.propose_edit", Idempotent = false)]
    [Description("Propose a section-scoped edit to a spec. The patch object must contain a property named after the section (e.g. {\"non_goals\": [...]} for section \"non_goals\"). Returns the updated spec including its recomputed readiness breakdown.")]
    public static async Task<CallToolResult> ProposeSpecEdit(
        SpecEditService service,
        IHttpContextAccessor http,
        IOptions<JsonOptions> json,
        [Description("Spec id (spec_*)")] string spec,
        [Description("One of: intent, non_goals, constraints, acceptance, decisions, open_questions, context_bundle")] string section,
        [Description("Patch object containing the section property")] JsonElement patch,
        CancellationToken ct)
    {
        var outcome = await service.ProposeEditAsync(new ProposeSpecEditRequest(spec, section, patch), Actor(http), ct);
        return Serialize(outcome, json);
    }

    [McpServerTool(Name = "task.create", Idempotent = false)]
    [Description("Create a task under a spec. Fails with E_POLICY_DENIED while the spec is readiness-gated. Agent-proposed tasks start unapproved and need a human approved_by before they can spawn sessions.")]
    public static async Task<CallToolResult> CreateTask(
        TaskToolService service,
        IHttpContextAccessor http,
        IOptions<JsonOptions> json,
        [Description("Parent spec id (spec_*)")] string spec,
        [Description("Task title (≤200 chars)")] string title,
        [Description("Accountable human assignee (usr_*)")] string assignee,
        [Description("Task description")] string? description = null,
        [Description("Repo paths this task is expected to touch")] IReadOnlyList<string>? paths = null,
        [Description("Risk level: green, amber or red")] string risk = "green",
        CancellationToken ct = default)
    {
        var outcome = await service.CreateAsync(
            new TaskCreateRequest(spec, title, assignee, description, ParentTask: null, paths, risk),
            Actor(http), ct);
        return Serialize(outcome, json, id => new { id });
    }

    [McpServerTool(Name = "task.update", Idempotent = false)]
    [Description("Update a task. Status changes are validated against the legal state machine (backlog → ready → in_progress → in_review → done, plus blocked/cancelled edges); illegal transitions fail with E_POLICY_DENIED.")]
    public static async Task<CallToolResult> UpdateTask(
        TaskToolService service,
        IHttpContextAccessor http,
        IOptions<JsonOptions> json,
        [Description("Task id (task_*)")] string task,
        [Description("New status")] string? status = null,
        [Description("New title")] string? title = null,
        [Description("New description")] string? description = null,
        [Description("New assignee (usr_*)")] string? assignee = null,
        [Description("New repo paths")] IReadOnlyList<string>? paths = null,
        [Description("New risk level: green, amber or red")] string? risk = null,
        CancellationToken ct = default)
    {
        var outcome = await service.UpdateAsync(
            new TaskUpdateRequest(task, status, title, description, assignee, paths, risk),
            Actor(http), ct);
        return Serialize(outcome, json, id => new { id });
    }

    private static string? Actor(IHttpContextAccessor http) =>
        http.HttpContext?.User.Identity?.Name;

    // Tools return CallToolResult directly so the contract error envelope
    // survives the transport: errors come back IsError=true with the
    // "E_*: message" text agents dispatch on (the SDK genericizes thrown
    // exceptions, which would swallow the code).
    private static CallToolResult Serialize<T>(ToolOutcome<T> outcome, IOptions<JsonOptions> json, Func<T, object>? shape = null)
    {
        if (!outcome.IsOk)
        {
            var error = new
            {
                error = new
                {
                    code = outcome.Error!.Code,
                    message = outcome.Error.Message,
                    retryable = outcome.Error.Retryable,
                },
            };
            return new CallToolResult
            {
                IsError = true,
                Content = [new TextContentBlock
                {
                    Text = $"{outcome.Error.Code}: {outcome.Error.Message}\n{JsonSerializer.Serialize(error, json.Value.SerializerOptions)}",
                }],
            };
        }

        var value = shape is null ? (object)outcome.Value! : shape(outcome.Value!);
        return new CallToolResult
        {
            IsError = false,
            Content = [new TextContentBlock { Text = JsonSerializer.Serialize(value, json.Value.SerializerOptions) }],
        };
    }
}
