using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Atlas.Api.Infrastructure;
using Dapper;
using FluentAssertions;
using FluentMigrator.Runner;
using Microsoft.Extensions.DependencyInjection;

namespace Atlas.Api.Tests.Integration;

[Trait("Category", "Integration")]
public sealed class ReadinessSseIntegrationTests(AtlasApiFactory factory)
    : IClassFixture<AtlasApiFactory>, IAsyncLifetime
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

        await conn.ExecuteAsync("""
            INSERT INTO workspace (id, name, slug, plan, acu_per_week, spec_sync, adr_sync)
              VALUES ('ws_test','Test','test','business',12000,
                      '{"enabled":false,"repo":null,"path_prefix":""}'::jsonb,
                      '{"enabled":false,"repo":null,"path_prefix":""}'::jsonb);
            INSERT INTO project (id, workspace, slug, name) VALUES ('prj_test','ws_test','core','Core');
            INSERT INTO atlas_user (id, workspace, email, name, role)
              VALUES ('usr_test','ws_test','dev@test.co','Dev','admin');
            INSERT INTO spec (id, workspace, project, title, slug, status, version, head_sha,
                              intent, readiness_breakdown, owner, created_by)
              VALUES ('spec_sse', 'ws_test', 'prj_test', 'SSE spec', 'sse-spec', 'draft', 0,
                      '0000000000000000000000000000000000000000', NULL,
                      '{"weights":{"acceptance_structure":40,"non_goals_present":20,"constraints_specific":20,"open_questions":10,"context_bundle":10},"components":{"acceptance_structure":{"score":0,"max":40,"notes":[]},"non_goals_present":{"score":0,"max":20,"notes":[]},"constraints_specific":{"score":0,"max":20,"notes":[]},"open_questions":{"score":10,"max":10,"notes":[]},"context_bundle":{"score":0,"max":10,"notes":[]}},"threshold":70,"gated":true,"score":10,"computed_at":"2026-04-23T00:00:00Z"}'::jsonb,
                      'usr_test','usr_test');
            """, transaction: tx);
        tx.Commit();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task SSE_subscriber_receives_initial_state_and_a_mutation_update()
    {
        using var streamClient = factory.CreateClient();
        streamClient.DefaultRequestHeaders.Accept.ParseAdd("text/event-stream");

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));

        // Open the SSE stream.
        using var req = new HttpRequestMessage(HttpMethod.Get, "/v1/specs/spec_sse/readiness");
        using var res = await streamClient.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cts.Token);
        res.IsSuccessStatusCode.Should().BeTrue();
        res.Content.Headers.ContentType!.MediaType.Should().Be("text/event-stream");

        using var stream = await res.Content.ReadAsStreamAsync(cts.Token);
        using var reader = new StreamReader(stream, Encoding.UTF8);

        // Read the initial state frame.
        var initial = await ReadSseFrameAsync(reader, cts.Token);
        initial.Should().NotBeNull();
        initial!.Event.Should().Be("readiness.updated");
        var initialBreakdown = JsonDocument.Parse(initial.Data);
        initialBreakdown.RootElement.GetProperty("threshold").GetInt32().Should().Be(70);

        // Fire a mutation from a separate client so the hub publishes.
        using var mutator = factory.CreateClient();
        var mutation = await mutator.PostAsJsonAsync("/v1/tools/spec.propose_edit", new
        {
            spec = "spec_sse",
            section = "intent",
            patch = new { intent = "new intent from SSE test" }
        }, cts.Token);
        mutation.EnsureSuccessStatusCode();

        // Expect a second frame on the subscribed stream.
        var update = await ReadSseFrameAsync(reader, cts.Token);
        update.Should().NotBeNull();
        update!.Event.Should().Be("readiness.updated");
        long.TryParse(update.Id, out var eventId).Should().BeTrue();
        eventId.Should().BeGreaterThan(0);
    }

    private static async Task<SseFrame?> ReadSseFrameAsync(StreamReader reader, CancellationToken ct)
    {
        string? id = null, ev = null, data = null;
        string? line;
        while ((line = await reader.ReadLineAsync(ct)) is not null)
        {
            if (line.Length == 0)
            {
                if (ev is not null && data is not null) return new SseFrame(id ?? "", ev, data);
                continue;
            }
            if (line.StartsWith("id: ")) id = line[4..];
            else if (line.StartsWith("event: ")) ev = line[7..];
            else if (line.StartsWith("data: ")) data = line[6..];
        }
        return null;
    }

    private sealed record SseFrame(string Id, string Event, string Data);
}
