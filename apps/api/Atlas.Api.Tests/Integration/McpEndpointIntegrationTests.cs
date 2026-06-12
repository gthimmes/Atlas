using System.Net;
using System.Text;
using System.Text.Json;
using Atlas.Api.Auth;
using Atlas.Api.Infrastructure;
using Dapper;
using FluentAssertions;
using FluentMigrator.Runner;
using Microsoft.Extensions.DependencyInjection;
using ModelContextProtocol;
using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;

namespace Atlas.Api.Tests.Integration;

/// <summary>
/// Exercises the MCP workspace:// endpoint end-to-end: handshake, resource
/// reads, tool calls, agent-token auth, and event-log actor attribution.
/// This is the build-order M2 exit criterion at the API level — an agent
/// connecting over MCP can lift a gated spec past the readiness threshold.
/// </summary>
[Trait("Category", "Integration")]
public sealed class McpEndpointIntegrationTests(AtlasApiFactory factory) : IClassFixture<AtlasApiFactory>, IAsyncLifetime
{
    private const string AgentToken = "atk_test_agent_token_1";

    public async Task InitializeAsync()
    {
        using var scope = factory.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<IMigrationRunner>().MigrateUp();

        var connFactory = scope.ServiceProvider.GetRequiredService<IAtlasConnectionFactory>();
        using var conn = connFactory.Open();
        using var tx = conn.BeginTransaction();

        foreach (var t in new[] { "agent_token", "task", "spec", "agent_identity", "atlas_user", "project", "workspace", "event_log" })
            await conn.ExecuteAsync($"TRUNCATE TABLE {t} RESTART IDENTITY CASCADE;", transaction: tx);

        await conn.ExecuteAsync("""
            INSERT INTO workspace (id, name, slug, plan, acu_per_week, spec_sync, adr_sync)
            VALUES ('ws_test', 'Test', 'test', 'business', 12000,
                    '{"enabled":false,"repo":null,"path_prefix":""}'::jsonb,
                    '{"enabled":false,"repo":null,"path_prefix":""}'::jsonb);
            INSERT INTO project (id, workspace, slug, name) VALUES ('prj_test', 'ws_test', 'core', 'Core');
            INSERT INTO atlas_user (id, workspace, email, name, role)
                VALUES ('usr_test', 'ws_test', 'dev@test.co', 'Dev', 'admin');
            INSERT INTO agent_identity (id, workspace, handle, model, oauth_issuer, owner, approved)
                VALUES ('agt_test', 'ws_test', 'test-agent', 'claude-fable-5', 'anthropic', 'usr_test', TRUE);
            INSERT INTO agent_identity (id, workspace, handle, model, oauth_issuer, owner, approved)
                VALUES ('agt_unapproved', 'ws_test', 'rogue-agent', 'claude-fable-5', 'anthropic', 'usr_test', FALSE);
            """, transaction: tx);

        await conn.ExecuteAsync("""
            INSERT INTO agent_token (id, agent, token_hash, label) VALUES
              ('tok_test', 'agt_test', @live, 'test'),
              ('tok_revoked', 'agt_test', @revoked, 'revoked test'),
              ('tok_rogue', 'agt_unapproved', @rogue, 'unapproved agent');
            UPDATE agent_token SET revoked_at = now() WHERE id = 'tok_revoked';
            """, new
        {
            live = AgentTokens.Hash(AgentToken),
            revoked = AgentTokens.Hash("atk_test_revoked_token"),
            rogue = AgentTokens.Hash("atk_test_rogue_token"),
        }, transaction: tx);

        // A gated draft spec (score 10: open questions free credit only).
        await conn.ExecuteAsync("""
            INSERT INTO spec (id, workspace, project, title, slug, status, version, head_sha,
                              intent, readiness_breakdown, owner, created_by)
            VALUES ('spec_test1', 'ws_test', 'prj_test', 'Test spec', 'test-spec', 'draft', 0,
                    '0000000000000000000000000000000000000000',
                    NULL,
                    '{"weights":{"acceptance_structure":40,"non_goals_present":20,"constraints_specific":20,"open_questions":10,"context_bundle":10},"components":{"acceptance_structure":{"score":0,"max":40,"notes":[]},"non_goals_present":{"score":0,"max":20,"notes":[]},"constraints_specific":{"score":0,"max":20,"notes":[]},"open_questions":{"score":10,"max":10,"notes":[]},"context_bundle":{"score":0,"max":10,"notes":[]}},"threshold":70,"gated":true,"score":10,"computed_at":"2026-04-23T00:00:00Z"}'::jsonb,
                    'usr_test', 'usr_test');
            """, transaction: tx);

        tx.Commit();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<McpClient> ConnectAsync(string token = AgentToken)
    {
        var httpClient = factory.CreateDefaultClient();
        var transport = new HttpClientTransport(new HttpClientTransportOptions
        {
            Endpoint = new Uri(httpClient.BaseAddress!, "/mcp"),
            TransportMode = HttpTransportMode.StreamableHttp,
            AdditionalHeaders = new Dictionary<string, string> { ["Authorization"] = $"Bearer {token}" },
        }, httpClient);
        return await McpClient.CreateAsync(transport);
    }

    private static string Text(CallToolResult result) =>
        string.Join("", result.Content.OfType<TextContentBlock>().Select(c => c.Text));

    private static string Text(ReadResourceResult result) =>
        string.Join("", result.Contents.OfType<TextResourceContents>().Select(c => c.Text));

    // ─── handshake + discovery ───────────────────────────────────────────

    [Fact]
    public async Task Handshake_advertises_contract_tools_and_resources()
    {
        await using var client = await ConnectAsync();

        client.ServerInfo.Name.Should().Be("atlas");

        var tools = await client.ListToolsAsync();
        tools.Select(t => t.Name).Should().Contain(["spec.propose_edit", "task.create", "task.update"]);

        var templates = await client.ListResourceTemplatesAsync();
        templates.Select(t => t.UriTemplate).Should().Contain([
            "workspace://specs/{id}",
            "workspace://specs/{id}/readiness",
            "workspace://tasks/{id}",
        ]);

        var resources = await client.ListResourcesAsync();
        resources.Select(r => r.Uri).Should().Contain(["workspace://specs", "workspace://tasks"]);
    }

    // ─── resources ───────────────────────────────────────────────────────

    [Fact]
    public async Task Read_spec_resource_returns_contract_payload()
    {
        await using var client = await ConnectAsync();

        var result = await client.ReadResourceAsync("workspace://specs/spec_test1");
        using var doc = JsonDocument.Parse(Text(result));

        doc.RootElement.GetProperty("id").GetString().Should().Be("spec_test1");
        doc.RootElement.GetProperty("readiness_breakdown").GetProperty("gated").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task Read_readiness_resource_returns_breakdown()
    {
        await using var client = await ConnectAsync();

        var result = await client.ReadResourceAsync("workspace://specs/spec_test1/readiness");
        using var doc = JsonDocument.Parse(Text(result));

        doc.RootElement.GetProperty("score").GetInt32().Should().Be(10);
        doc.RootElement.GetProperty("threshold").GetInt32().Should().Be(70);
    }

    // ─── the M2 exit criterion: agent lifts a gated spec over MCP ─────────

    [Fact]
    public async Task Agent_lifts_gated_spec_past_threshold_via_propose_edit()
    {
        await using var client = await ConnectAsync();

        await client.CallToolAsync("spec.propose_edit", new Dictionary<string, object?>
        {
            ["spec"] = "spec_test1",
            ["section"] = "non_goals",
            ["patch"] = JsonSerializer.SerializeToElement(new
            {
                non_goals = new[]
                {
                    "No mobile app support in this first release cycle",
                    "No learned ML risk classifier until we have labeled outcomes",
                },
            }),
        });

        await client.CallToolAsync("spec.propose_edit", new Dictionary<string, object?>
        {
            ["spec"] = "spec_test1",
            ["section"] = "constraints",
            ["patch"] = JsonSerializer.SerializeToElement(new
            {
                constraints = new object[]
                {
                    new
                    {
                        id = "con_1",
                        text = "P99 readiness recompute latency stays under budget",
                        category = "performance",
                        budget = new { metric = "p99_latency_ms", op = "<=", value = 500 },
                    },
                },
            }),
        });

        var final = await client.CallToolAsync("spec.propose_edit", new Dictionary<string, object?>
        {
            ["spec"] = "spec_test1",
            ["section"] = "acceptance",
            ["patch"] = JsonSerializer.SerializeToElement(new
            {
                acceptance = new object[]
                {
                    new { id = "ac_1", statement = "Spec readiness recomputes on every mutation", test_type = "integration", status = "pending" },
                    new { id = "ac_2", statement = "Gated specs reject task.create with E_POLICY_DENIED", test_type = "integration", status = "pending" },
                    new { id = "ac_3", statement = "Readiness SSE stream emits on edit", test_type = "manual", status = "pending" },
                },
            }),
        });

        final.IsError.Should().BeFalse(Text(final));
        using var doc = JsonDocument.Parse(Text(final));
        var breakdown = doc.RootElement.GetProperty("readiness_breakdown");
        breakdown.GetProperty("score").GetInt32().Should().BeGreaterThanOrEqualTo(70);
        breakdown.GetProperty("gated").GetBoolean().Should().BeFalse();

        // Events must be attributed to the token's agent identity.
        using var scope = factory.Services.CreateScope();
        var connFactory = scope.ServiceProvider.GetRequiredService<IAtlasConnectionFactory>();
        using var conn = connFactory.Open();
        var actors = (await conn.QueryAsync<(string actor, string actor_kind)>(
            "SELECT actor, actor_kind FROM event_log WHERE aggregate_id = 'spec_test1';")).ToList();
        actors.Should().NotBeEmpty();
        actors.Should().AllSatisfy(a =>
        {
            a.actor.Should().Be("agt_test");
            a.actor_kind.Should().Be("agent");
        });
    }

    // ─── policy enforcement through MCP ────────────────────────────────────

    [Fact]
    public async Task Task_create_on_gated_spec_fails_with_policy_denied()
    {
        await using var client = await ConnectAsync();

        var error = await CallExpectingErrorAsync(client, "task.create", new Dictionary<string, object?>
        {
            ["spec"] = "spec_test1",
            ["title"] = "Should not exist",
            ["assignee"] = "usr_test",
        });

        error.Should().Contain("E_POLICY_DENIED");
    }

    [Fact]
    public async Task Unknown_spec_fails_with_not_found()
    {
        await using var client = await ConnectAsync();

        var error = await CallExpectingErrorAsync(client, "spec.propose_edit", new Dictionary<string, object?>
        {
            ["spec"] = "spec_nope",
            ["section"] = "intent",
            ["patch"] = JsonSerializer.SerializeToElement(new { intent = "x" }),
        });

        error.Should().Contain("E_NOT_FOUND");
    }

    /// <summary>Tool failures surface either as McpException (protocol error) or an isError result; accept both shapes.</summary>
    private static async Task<string> CallExpectingErrorAsync(McpClient client, string tool, Dictionary<string, object?> args)
    {
        try
        {
            var result = await client.CallToolAsync(tool, args);
            result.IsError.Should().BeTrue($"expected {tool} to fail but it returned: {Text(result)}");
            return Text(result);
        }
        catch (McpException ex)
        {
            return ex.Message;
        }
    }

    // ─── auth ──────────────────────────────────────────────────────────────

    [Theory]
    [InlineData(null)]
    [InlineData("atk_test_wrong_token_x")]
    [InlineData("atk_test_revoked_token")]
    [InlineData("atk_test_rogue_token")] // valid token, unapproved agent
    public async Task Mcp_requests_without_valid_token_are_unauthorized(string? token)
    {
        using var httpClient = factory.CreateDefaultClient();
        using var req = new HttpRequestMessage(HttpMethod.Post, "/mcp");
        req.Content = new StringContent(
            """{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}""",
            Encoding.UTF8, "application/json");
        req.Headers.TryAddWithoutValidation("Accept", "application/json, text/event-stream");
        if (token is not null)
            req.Headers.TryAddWithoutValidation("Authorization", $"Bearer {token}");

        using var res = await httpClient.SendAsync(req);
        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task V1_http_surface_stays_open_for_the_web_ui()
    {
        using var httpClient = factory.CreateDefaultClient();
        var res = await httpClient.GetAsync("/v1/specs/spec_test1");
        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
