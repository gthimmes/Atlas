using Atlas.Api.Infrastructure;
using Dapper;

namespace Atlas.Api.Endpoints;

public static class HealthEndpoints
{
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder routes)
    {
        routes.MapGet("/v1/health", () => Results.Ok(new HealthResponse("ok", "atlas-api", typeof(Program).Assembly.GetName().Version?.ToString() ?? "0.0.0")))
            .WithName("GetHealth")
            .WithTags("health");

        routes.MapGet("/v1/health/db", async (IAtlasConnectionFactory factory, CancellationToken ct) =>
        {
            try
            {
                using var conn = factory.Open();
                var one = await conn.ExecuteScalarAsync<int>(new CommandDefinition("SELECT 1", cancellationToken: ct));
                return Results.Ok(new HealthResponse(one == 1 ? "ok" : "degraded", "atlas-db", null));
            }
            catch (Exception ex)
            {
                return Results.Json(new HealthResponse("error", "atlas-db", ex.GetType().Name), statusCode: 503);
            }
        })
        .WithName("GetDbHealth")
        .WithTags("health");

        return routes;
    }
}

public sealed record HealthResponse(string Status, string Component, string? Detail);
