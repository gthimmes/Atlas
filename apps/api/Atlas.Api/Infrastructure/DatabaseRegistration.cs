using System.Data;
using Atlas.Api.Migrations;
using FluentMigrator.Runner;
using Npgsql;

namespace Atlas.Api.Infrastructure;

public static class DatabaseRegistration
{
    public static IServiceCollection AddAtlasDatabase(this IServiceCollection services, IConfiguration configuration)
    {
        // Read the connection string lazily so test factories that override
        // the configuration after registration still get their overrides.
        services.AddSingleton<IAtlasConnectionFactory>(sp =>
        {
            var cfg = sp.GetRequiredService<IConfiguration>();
            return new NpgsqlConnectionFactory(ResolveConnectionString(cfg));
        });

        services
            .AddFluentMigratorCore()
            .ConfigureRunner(rb => rb
                .AddPostgres()
                .ScanIn(typeof(Initial_001_EventLog).Assembly).For.Migrations())
            .AddLogging(lb => lb.AddFluentMigratorConsole())
            .Configure<FluentMigrator.Runner.Processors.ProcessorOptions>(o => { });

        // FluentMigrator requires a connection string at resolution time; resolve via IOptions.
        services.AddSingleton<FluentMigrator.Runner.Initialization.IConnectionStringReader>(sp =>
            new FluentConnectionStringReader(ResolveConnectionString(sp.GetRequiredService<IConfiguration>())));

        return services;
    }

    private static string ResolveConnectionString(IConfiguration configuration) =>
        configuration["ATLAS_DB_CONNECTION_STRING"]
        ?? Environment.GetEnvironmentVariable("ATLAS_DB_CONNECTION_STRING")
        ?? configuration.GetConnectionString("Atlas")
        ?? throw new InvalidOperationException("ATLAS_DB_CONNECTION_STRING not configured");
}

internal sealed class FluentConnectionStringReader(string connectionString)
    : FluentMigrator.Runner.Initialization.IConnectionStringReader
{
    public int Priority => 0;
    public string GetConnectionString(string connectionStringOrName) => connectionString;
}

public interface IAtlasConnectionFactory
{
    IDbConnection Open();
}

public sealed class NpgsqlConnectionFactory(string connectionString) : IAtlasConnectionFactory
{
    public IDbConnection Open()
    {
        var conn = new NpgsqlConnection(connectionString);
        conn.Open();
        return conn;
    }
}
