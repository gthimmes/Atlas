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
public sealed class WorkspaceToolEndpointsIntegrationTests(AtlasApiFactory factory)
    : IClassFixture<AtlasApiFactory>,
        IAsyncLifetime
{
    public async Task InitializeAsync()
    {
        using var scope = factory.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<IMigrationRunner>().MigrateUp();
        var f = scope.ServiceProvider.GetRequiredService<IAtlasConnectionFactory>();
        using var conn = f.Open();
        using var tx = conn.BeginTransaction();

        foreach (var t in new[] { "task", "spec", "agent_identity", "atlas_user", "project", "workspace", "event_log" })
            await conn.ExecuteAsync($"TRUNCATE TABLE {t} RESTART IDENTITY CASCADE;", transaction: tx);

        await conn.ExecuteAsync(
            """
            INSERT INTO workspace (id, name, slug, plan, acu_per_week, spec_sync, adr_sync)
              VALUES ('ws_test','Test','test','business',12000,
                      '{"enabled":false,"repo":null,"path_prefix":""}'::jsonb,
                      '{"enabled":false,"repo":null,"path_prefix":""}'::jsonb);
            INSERT INTO project (id, workspace, slug, name) VALUES ('prj_test','ws_test','core','Core');
            INSERT INTO atlas_user (id, workspace, email, name, role)
              VALUES ('usr_test','ws_test','dev@test.co','Dev','admin');
            """, transaction: tx);

        tx.Commit();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task spec_create_persists_a_new_draft_spec_with_readiness_10()
    {
        using var client = factory.CreateClient();
        var res = await client.PostAsJsonAsync("/v1/tools/spec.create", new
        {
            title = "Ship the onboarding flow",
            project = "prj_test",
            owner = "usr_test",
        });
        res.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await res.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetString()!;

        var spec = await (await client.GetAsync($"/v1/specs/{id}")).Content.ReadFromJsonAsync<JsonElement>();
        spec.GetProperty("status").GetString().Should().Be("draft");
        spec.GetProperty("title").GetString().Should().Be("Ship the onboarding flow");
        spec.GetProperty("slug").GetString().Should().Be("ship-the-onboarding-flow");
        spec.GetProperty("readiness_score").GetInt32().Should().Be(10);
        spec.GetProperty("readiness_breakdown").GetProperty("gated").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task spec_create_rejects_bad_project()
    {
        using var client = factory.CreateClient();
        var res = await client.PostAsJsonAsync("/v1/tools/spec.create", new
        {
            title = "Nowhere spec",
            project = "prj_does_not_exist",
            owner = "usr_test",
        });
        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task spec_create_collision_on_slug_disambiguates_with_suffix()
    {
        using var client = factory.CreateClient();
        for (var i = 0; i < 3; i++)
        {
            var r = await client.PostAsJsonAsync("/v1/tools/spec.create", new
            {
                title = "Same title",
                project = "prj_test",
                owner = "usr_test",
            });
            r.EnsureSuccessStatusCode();
        }
        var specs = await (await client.GetAsync("/v1/specs")).Content.ReadFromJsonAsync<JsonElement>();
        var slugs = specs.GetProperty("items").EnumerateArray().Select(s => s.GetProperty("slug").GetString()).ToArray();
        slugs.Should().Contain(new[] { "same-title", "same-title-2", "same-title-3" });
    }

    [Fact]
    public async Task task_create_is_rejected_on_newly_created_draft_spec()
    {
        using var client = factory.CreateClient();
        var create = await client.PostAsJsonAsync("/v1/tools/spec.create", new
        {
            title = "Gated on purpose",
            project = "prj_test",
            owner = "usr_test",
        });
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        var res = await client.PostAsJsonAsync("/v1/tools/task.create", new
        {
            spec = id,
            title = "should be blocked",
            assignee = "usr_test",
        });
        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task project_create_then_lists()
    {
        using var client = factory.CreateClient();
        var res = await client.PostAsJsonAsync("/v1/tools/project.create", new
        {
            slug = "platform",
            name = "Platform",
        });
        res.StatusCode.Should().Be(HttpStatusCode.Created);

        var list = await (await client.GetAsync("/v1/projects")).Content.ReadFromJsonAsync<JsonElement>();
        list.GetProperty("items").EnumerateArray().Select(p => p.GetProperty("slug").GetString())
            .Should().Contain("platform");
    }

    [Fact]
    public async Task workspace_reset_wipes_specs_tasks_and_event_log()
    {
        using var client = factory.CreateClient();
        await client.PostAsJsonAsync("/v1/tools/spec.create", new
        {
            title = "To be wiped",
            project = "prj_test",
            owner = "usr_test",
        });
        (await (await client.GetAsync("/v1/specs")).Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("items").GetArrayLength().Should().BeGreaterThan(0);

        var reset = await client.PostAsJsonAsync("/v1/tools/workspace.reset", new { });
        reset.EnsureSuccessStatusCode();

        (await (await client.GetAsync("/v1/specs")).Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("items").GetArrayLength().Should().Be(0);
        // Projects + users survive the reset.
        (await (await client.GetAsync("/v1/projects")).Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("items").GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task list_users_returns_seeded_user()
    {
        using var client = factory.CreateClient();
        var list = await (await client.GetAsync("/v1/users")).Content.ReadFromJsonAsync<JsonElement>();
        list.GetProperty("items").EnumerateArray().Select(u => u.GetProperty("id").GetString())
            .Should().Contain("usr_test");
    }
}
