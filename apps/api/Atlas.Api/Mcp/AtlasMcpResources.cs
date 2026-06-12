using System.ComponentModel;
using System.Text.Json;
using Atlas.Api.Domain;
using Atlas.Api.Endpoints;
using Atlas.Api.Infrastructure;
using Dapper;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.Options;
using ModelContextProtocol;
using ModelContextProtocol.Server;

namespace Atlas.Api.Mcp;

/// <summary>
/// MCP `resources/*` surface (api-contract.md §Resources). Read-only by
/// design — all mutation goes through tools (decisions.md §2). URIs match
/// the contract's workspace:// scheme; payloads are byte-identical to the
/// /v1 HTTP responses.
/// </summary>
[McpServerResourceType]
public sealed class AtlasMcpResources
{
    [McpServerResource(UriTemplate = "workspace://specs", Name = "specs", MimeType = "application/json")]
    [Description("All specs in the workspace, newest first.")]
    public static async Task<string> ListSpecs(
        IAtlasConnectionFactory factory, IOptions<JsonOptions> json, CancellationToken ct)
    {
        using var conn = factory.Open();
        var rows = await conn.QueryAsync<SpecRow>(new CommandDefinition(
            $"{SpecRow.SelectColumns} ORDER BY updated_at DESC LIMIT 200;", cancellationToken: ct));
        var items = rows.Select(r => r.Materialize(json.Value.SerializerOptions)).ToList();
        return JsonSerializer.Serialize(new { items, next_cursor = (string?)null }, json.Value.SerializerOptions);
    }

    [McpServerResource(UriTemplate = "workspace://specs/{id}", Name = "spec", MimeType = "application/json")]
    [Description("A single spec with acceptance criteria, constraints and readiness breakdown.")]
    public static async Task<string> GetSpec(
        IAtlasConnectionFactory factory, IOptions<JsonOptions> json, string id, CancellationToken ct)
    {
        using var conn = factory.Open();
        var row = await conn.QuerySingleOrDefaultAsync<SpecRow>(new CommandDefinition(
            $"{SpecRow.SelectColumns} WHERE id = @id;", new { id }, cancellationToken: ct));
        if (row is null) throw new McpException($"E_NOT_FOUND: spec {id} not found");
        return JsonSerializer.Serialize(row.Materialize(json.Value.SerializerOptions), json.Value.SerializerOptions);
    }

    [McpServerResource(UriTemplate = "workspace://specs/{id}/readiness", Name = "spec-readiness", MimeType = "application/json")]
    [Description("The spec's readiness breakdown: per-component scores, total, threshold and gated flag. Specs below threshold cannot spawn tasks.")]
    public static async Task<string> GetReadiness(
        IAtlasConnectionFactory factory, string id, CancellationToken ct)
    {
        using var conn = factory.Open();
        var raw = await conn.QuerySingleOrDefaultAsync<string>(new CommandDefinition(
            "SELECT readiness_breakdown::text FROM spec WHERE id = @id;", new { id }, cancellationToken: ct));
        return raw ?? throw new McpException($"E_NOT_FOUND: spec {id} not found");
    }

    [McpServerResource(UriTemplate = "workspace://tasks", Name = "tasks", MimeType = "application/json")]
    [Description("All tasks in the workspace, oldest first.")]
    public static async Task<string> ListTasks(
        IAtlasConnectionFactory factory, IOptions<JsonOptions> json, CancellationToken ct)
    {
        using var conn = factory.Open();
        var rows = await conn.QueryAsync<TaskRow>(new CommandDefinition("""
            SELECT id, workspace, parent_spec, parent_task, title, description, status,
                   assignee, delegated_to, delegation_history::text AS delegation_history,
                   blocks::text AS blocks, blocked_by::text AS blocked_by,
                   context_bundle_override, agent_budget::text AS agent_budget, risk,
                   paths::text AS paths, proposed_by, approved_by,
                   created_at, updated_at, completed_at
            FROM task ORDER BY created_at LIMIT 500;
            """, cancellationToken: ct));
        var items = rows.Select(r => r.Materialize()).ToList();
        return JsonSerializer.Serialize(new { items, next_cursor = (string?)null }, json.Value.SerializerOptions);
    }

    [McpServerResource(UriTemplate = "workspace://tasks/{id}", Name = "task", MimeType = "application/json")]
    [Description("A single task with status, assignee, risk, paths and delegation history.")]
    public static async Task<string> GetTask(
        IAtlasConnectionFactory factory, IOptions<JsonOptions> json, string id, CancellationToken ct)
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
        if (row is null) throw new McpException($"E_NOT_FOUND: task {id} not found");
        return JsonSerializer.Serialize(row.Materialize(), json.Value.SerializerOptions);
    }
}
