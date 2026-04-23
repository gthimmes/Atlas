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
public sealed class TaskToolEndpointsIntegrationTests(AtlasApiFactory factory)
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

        foreach (
            var t in new[] { "task", "spec", "agent_identity", "atlas_user", "project", "workspace", "event_log" }
        )
            await conn.ExecuteAsync(
                $"TRUNCATE TABLE {t} RESTART IDENTITY CASCADE;",
                transaction: tx
            );

        await conn.ExecuteAsync(
            """
            INSERT INTO workspace (id, name, slug, plan, acu_per_week, spec_sync, adr_sync)
              VALUES ('ws_test','Test','test','business',12000,
                      '{"enabled":false,"repo":null,"path_prefix":""}'::jsonb,
                      '{"enabled":false,"repo":null,"path_prefix":""}'::jsonb);
            INSERT INTO project (id, workspace, slug, name) VALUES ('prj_test','ws_test','core','Core');
            INSERT INTO atlas_user (id, workspace, email, name, role)
              VALUES ('usr_test','ws_test','dev@test.co','Dev','admin'),
                     ('usr_dev','ws_test','admin@test.co','Admin','admin');

            -- Gated spec: readiness breakdown says gated=true.
            INSERT INTO spec (id, workspace, project, title, slug, status, version, head_sha,
                              intent, readiness_breakdown, owner, created_by)
              VALUES ('spec_gated','ws_test','prj_test','Gated','gated','draft',0,'0',
                      NULL,
                      '{"weights":{},"components":{},"threshold":70,"gated":true,"score":10,"computed_at":"2026-04-23T00:00:00Z"}'::jsonb,
                      'usr_test','usr_test');

            -- Ungated spec: gated=false.
            INSERT INTO spec (id, workspace, project, title, slug, status, version, head_sha,
                              intent, readiness_breakdown, owner, created_by)
              VALUES ('spec_ready','ws_test','prj_test','Ready','ready','draft',0,'0',
                      NULL,
                      '{"weights":{},"components":{},"threshold":70,"gated":false,"score":80,"computed_at":"2026-04-23T00:00:00Z"}'::jsonb,
                      'usr_test','usr_test');
            """,
            transaction: tx
        );

        tx.Commit();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task task_create_is_rejected_on_gated_spec()
    {
        using var client = factory.CreateClient();
        var res = await client.PostAsJsonAsync(
            "/v1/tools/task.create",
            new
            {
                spec = "spec_gated",
                title = "should not land",
                assignee = "usr_test",
            }
        );
        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("error").GetProperty("code").GetString().Should().Be("E_POLICY_DENIED");
    }

    [Fact]
    public async Task task_create_succeeds_on_ungated_spec_and_bumps_spec_task_ids()
    {
        using var client = factory.CreateClient();
        var res = await client.PostAsJsonAsync(
            "/v1/tools/task.create",
            new
            {
                spec = "spec_ready",
                title = "Build cutover rehearsal harness",
                assignee = "usr_test",
                risk = "amber",
                paths = new[] { "src/cutover/" },
            }
        );
        res.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        var taskId = body.GetProperty("id").GetString()!;
        taskId.Should().StartWith("task_");

        // Task should exist with status 'proposed' and risk 'amber'.
        var get = await client.GetAsync($"/v1/tasks/{taskId}");
        get.StatusCode.Should().Be(HttpStatusCode.OK);
        var task = await get.Content.ReadFromJsonAsync<JsonElement>();
        task.GetProperty("status").GetString().Should().Be("proposed");
        task.GetProperty("risk").GetString().Should().Be("amber");
        // Auto-approved by the default actor (spec owner in Phase 2 since
        // OAuth lands in Phase 3). Parent spec_ready owner is usr_test.
        task.GetProperty("approved_by").GetString().Should().Be("usr_test");

        // Parent spec's task_ids should include it.
        var spec = await client.GetAsync("/v1/specs/spec_ready");
        var specDoc = await spec.Content.ReadFromJsonAsync<JsonElement>();
        specDoc
            .GetProperty("task_ids")
            .EnumerateArray()
            .Select(e => e.GetString())
            .Should()
            .Contain(taskId);
    }

    [Fact]
    public async Task task_update_enforces_state_machine()
    {
        using var client = factory.CreateClient();
        var create = await client.PostAsJsonAsync(
            "/v1/tools/task.create",
            new
            {
                spec = "spec_ready",
                title = "state machine guinea pig",
                assignee = "usr_test",
            }
        );
        var taskId = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        // proposed → done is illegal.
        var illegal = await client.PostAsJsonAsync(
            "/v1/tools/task.update",
            new { task = taskId, status = "done" }
        );
        illegal.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        // proposed → ready → in_flight is legal.
        (await client.PostAsJsonAsync("/v1/tools/task.update", new { task = taskId, status = "ready" })).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/v1/tools/task.update", new { task = taskId, status = "in_flight" })).EnsureSuccessStatusCode();

        var get = await client.GetAsync($"/v1/tasks/{taskId}");
        var task = await get.Content.ReadFromJsonAsync<JsonElement>();
        task.GetProperty("status").GetString().Should().Be("in_flight");
    }

    [Fact]
    public async Task task_update_can_retitle_and_reassign_in_one_call()
    {
        using var client = factory.CreateClient();
        var create = await client.PostAsJsonAsync(
            "/v1/tools/task.create",
            new
            {
                spec = "spec_ready",
                title = "original title",
                assignee = "usr_test",
            }
        );
        var taskId = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;

        var res = await client.PostAsJsonAsync(
            "/v1/tools/task.update",
            new
            {
                task = taskId,
                title = "renamed",
                description = "updated description",
            }
        );
        res.EnsureSuccessStatusCode();

        var task = await (await client.GetAsync($"/v1/tasks/{taskId}")).Content.ReadFromJsonAsync<JsonElement>();
        task.GetProperty("title").GetString().Should().Be("renamed");
        task.GetProperty("description").GetString().Should().Be("updated description");
    }

    [Fact]
    public async Task marking_done_sets_completed_at()
    {
        using var client = factory.CreateClient();
        var taskId = await QuickCreate(client);

        foreach (var s in new[] { "ready", "in_flight", "review", "done" })
            (await client.PostAsJsonAsync("/v1/tools/task.update", new { task = taskId, status = s })).EnsureSuccessStatusCode();

        var task = await (await client.GetAsync($"/v1/tasks/{taskId}")).Content.ReadFromJsonAsync<JsonElement>();
        task.GetProperty("status").GetString().Should().Be("done");
        task.GetProperty("completed_at").ValueKind.Should().NotBe(JsonValueKind.Null);
    }

    private static async Task<string> QuickCreate(HttpClient client)
    {
        var res = await client.PostAsJsonAsync(
            "/v1/tools/task.create",
            new
            {
                spec = "spec_ready",
                title = "quick",
                assignee = "usr_test",
            }
        );
        return (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;
    }
}
