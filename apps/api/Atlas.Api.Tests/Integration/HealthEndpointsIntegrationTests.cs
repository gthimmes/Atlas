using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace Atlas.Api.Tests.Integration;

[Trait("Category", "Integration")]
public sealed class HealthEndpointsIntegrationTests(AtlasApiFactory factory) : IClassFixture<AtlasApiFactory>
{
    [Fact]
    public async Task GET_v1_health_returns_ok()
    {
        using var client = factory.CreateClient();
        var res = await client.GetAsync("/v1/health");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await res.Content.ReadFromJsonAsync<HealthBody>();
        body.Should().NotBeNull();
        body!.Status.Should().Be("ok");
        body.Component.Should().Be("atlas-api");
    }

    [Fact]
    public async Task GET_v1_health_db_returns_ok_once_container_is_running()
    {
        using var client = factory.CreateClient();
        var res = await client.GetAsync("/v1/health/db");
        // The Testcontainers Postgres is running and has `SELECT 1` available
        // even without migrations, so the db health probe should succeed.
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await res.Content.ReadFromJsonAsync<HealthBody>();
        body!.Status.Should().Be("ok");
    }

    private sealed record HealthBody(string Status, string Component, string? Detail);
}
