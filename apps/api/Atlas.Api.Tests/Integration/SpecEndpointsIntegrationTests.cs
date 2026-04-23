using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Atlas.Api.Infrastructure;
using Dapper;
using FluentAssertions;
using FluentMigrator.Runner;
using Microsoft.Extensions.DependencyInjection;

namespace Atlas.Api.Tests.Integration;

[Trait("Category", "Integration")]
public sealed class SpecEndpointsIntegrationTests(AtlasApiFactory factory) : IClassFixture<AtlasApiFactory>, IAsyncLifetime
{
    public async Task InitializeAsync()
    {
        using var scope = factory.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<IMigrationRunner>().MigrateUp();

        var connFactory = scope.ServiceProvider.GetRequiredService<IAtlasConnectionFactory>();
        using var conn = connFactory.Open();
        using var tx = conn.BeginTransaction();

        // Wipe in FK-safe order.
        foreach (var t in new[] { "task", "spec", "agent_identity", "atlas_user", "project", "workspace", "event_log" })
            await conn.ExecuteAsync($"TRUNCATE TABLE {t} RESTART IDENTITY CASCADE;", transaction: tx);

        // Minimal fixture: one workspace, one project, one user, one spec.
        await conn.ExecuteAsync("""
            INSERT INTO workspace (id, name, slug, plan, acu_per_week, spec_sync, adr_sync)
            VALUES ('ws_test', 'Test', 'test', 'business', 12000,
                    '{"enabled":false,"repo":null,"path_prefix":""}'::jsonb,
                    '{"enabled":false,"repo":null,"path_prefix":""}'::jsonb);
            INSERT INTO project (id, workspace, slug, name) VALUES ('prj_test', 'ws_test', 'core', 'Core');
            INSERT INTO atlas_user (id, workspace, email, name, role)
                VALUES ('usr_test', 'ws_test', 'dev@test.co', 'Dev', 'admin');
            """, transaction: tx);

        // Seed an empty spec. Readiness recompute will overwrite the initial breakdown.
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

    [Fact]
    public async Task GET_returns_seeded_spec()
    {
        using var client = factory.CreateClient();
        var res = await client.GetAsync("/v1/specs/spec_test1");
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var doc = await res.Content.ReadFromJsonAsync<JsonElement>();
        doc.GetProperty("id").GetString().Should().Be("spec_test1");
        doc.GetProperty("title").GetString().Should().Be("Test spec");
    }

    [Fact]
    public async Task GET_returns_404_for_unknown_spec()
    {
        using var client = factory.CreateClient();
        var res = await client.GetAsync("/v1/specs/spec_does_not_exist");
        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task propose_edit_on_intent_bumps_version_and_recomputes_readiness()
    {
        using var client = factory.CreateClient();

        var before = await client.GetFromJsonAsync<JsonElement>("/v1/specs/spec_test1");
        var versionBefore = before.GetProperty("version").GetInt32();

        var res = await client.PostAsJsonAsync("/v1/tools/spec.propose_edit", new
        {
            spec = "spec_test1",
            section = "intent",
            patch = new { intent = "Reduce merge latency by 30% without rollback regressions." }
        });
        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var updated = await res.Content.ReadFromJsonAsync<JsonElement>();
        updated.GetProperty("version").GetInt32().Should().Be(versionBefore + 1);
        updated.GetProperty("intent").GetString().Should().Contain("Reduce merge latency");

        // Intent is not a readiness component; an intent-only edit should
        // leave the score at the formula's reference value for the current
        // spec state. Empty spec => 10 (no blocking questions = full 10/10).
        updated.GetProperty("readiness_score").GetInt32().Should().Be(10);

        // And a second intent edit must not drift it.
        var second = await client.PostAsJsonAsync("/v1/tools/spec.propose_edit", new
        {
            spec = "spec_test1",
            section = "intent",
            patch = new { intent = "Second revision of intent prose." }
        });
        var twice = await second.Content.ReadFromJsonAsync<JsonElement>();
        twice.GetProperty("readiness_score").GetInt32().Should().Be(10);
    }

    [Fact]
    public async Task propose_edit_on_acceptance_lifts_the_gate()
    {
        using var client = factory.CreateClient();

        var before = await client.GetFromJsonAsync<JsonElement>("/v1/specs/spec_test1");
        before.GetProperty("readiness_breakdown").GetProperty("gated").GetBoolean().Should().BeTrue();

        await client.PostAsJsonAsync("/v1/tools/spec.propose_edit", new
        {
            spec = "spec_test1",
            section = "acceptance",
            patch = new
            {
                acceptance = new object[] {
                    new { id = "ac_1", spec = "spec_test1", statement = "green merges ≤ 90s p50", test_type = "property", test_ref = (object?)null, status = "unverified", flakiness_score = 0.0, last_run_at = (string?)null, run_history = Array.Empty<object>(), owner = "usr_test", proposed_by = "usr_test", accepted = true, created_at = "2026-04-23T00:00:00Z" },
                    new { id = "ac_2", spec = "spec_test1", statement = "amber holds 1h", test_type = "integration", test_ref = (object?)null, status = "unverified", flakiness_score = 0.0, last_run_at = (string?)null, run_history = Array.Empty<object>(), owner = "usr_test", proposed_by = "usr_test", accepted = true, created_at = "2026-04-23T00:00:00Z" },
                    new { id = "ac_3", spec = "spec_test1", statement = "red never auto-merges", test_type = "property", test_ref = (object?)null, status = "unverified", flakiness_score = 0.0, last_run_at = (string?)null, run_history = Array.Empty<object>(), owner = "usr_test", proposed_by = "usr_test", accepted = true, created_at = "2026-04-23T00:00:00Z" },
                }
            }
        });

        // Need non_goals and constraints to cross the threshold too.
        await client.PostAsJsonAsync("/v1/tools/spec.propose_edit", new
        {
            spec = "spec_test1",
            section = "non_goals",
            patch = new { non_goals = new[] { "We will not change the fraud scoring pipeline", "We will not support international addresses in this bet" } }
        });

        await client.PostAsJsonAsync("/v1/tools/spec.propose_edit", new
        {
            spec = "spec_test1",
            section = "constraints",
            patch = new
            {
                constraints = new object[] {
                new { id = "c1", text = "p95 < 120ms", category = "performance", budget = new { metric = "p95", op = "<", value = 120, unit = "ms" } }
            }
            }
        });

        var after = await client.GetFromJsonAsync<JsonElement>("/v1/specs/spec_test1");
        after.GetProperty("readiness_score").GetInt32().Should().BeGreaterOrEqualTo(70);
        after.GetProperty("readiness_breakdown").GetProperty("gated").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task propose_edit_with_unknown_section_returns_400()
    {
        using var client = factory.CreateClient();
        var res = await client.PostAsJsonAsync("/v1/tools/spec.propose_edit", new
        {
            spec = "spec_test1",
            section = "title", // not in the allowlist
            patch = new { title = "nope" }
        });
        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GET_readiness_without_sse_header_returns_json()
    {
        using var client = factory.CreateClient();
        var res = await client.GetAsync("/v1/specs/spec_test1/readiness");
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        res.Content.Headers.ContentType!.MediaType.Should().Be("application/json");
        var doc = await res.Content.ReadFromJsonAsync<JsonElement>();
        doc.GetProperty("threshold").GetInt32().Should().Be(70);
    }
}
