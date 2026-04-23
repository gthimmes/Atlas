using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Testcontainers.PostgreSql;

namespace Atlas.Api.Tests.Integration;

/// <summary>
/// Spins up a throwaway Postgres container per test class and wires the
/// API to it. Migrations are applied by the seed codepath in Program.cs;
/// tests that need data call await SeedAsync() explicitly.
/// </summary>
public sealed class AtlasApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _pg = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("atlas")
        .WithUsername("atlas")
        .WithPassword("atlas")
        .Build();

    public string ConnectionString => _pg.GetConnectionString();

    public Task InitializeAsync() => _pg.StartAsync();

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await _pg.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, cfg) =>
        {
            cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ATLAS_DB_CONNECTION_STRING"] = _pg.GetConnectionString(),
            });
        });
    }
}
