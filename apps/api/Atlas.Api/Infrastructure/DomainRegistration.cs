using System.Text.Json;
using Atlas.Api.Domain;
using Atlas.Api.EventSourcing;
using Atlas.Api.Readiness;
using Atlas.Api.Sse;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.Options;

namespace Atlas.Api.Infrastructure;

public static class DomainRegistration
{
    public static IServiceCollection AddAtlasDomain(this IServiceCollection services)
    {
        // Readiness is a pure function; singleton is safe.
        services.AddSingleton<IReadinessCalculator>(_ => new ReadinessCalculator());

        // Event log writer depends on the shared JSON options so payloads match
        // the snake_case convention used everywhere else.
        services.AddSingleton<IEventLog>(sp => new EventLog(sp.GetRequiredService<IOptions<JsonOptions>>().Value.SerializerOptions));
        services.AddSingleton<SpecProjection>(sp => new SpecProjection(
            sp.GetRequiredService<IOptions<JsonOptions>>().Value.SerializerOptions,
            sp.GetRequiredService<IReadinessCalculator>()));
        services.AddSingleton<TaskProjection>(sp => new TaskProjection(
            sp.GetRequiredService<IOptions<JsonOptions>>().Value.SerializerOptions));

        // SSE fan-out hub (readiness updates + later: activity streams).
        services.AddSingleton<ISpecReadinessHub, SpecReadinessHub>();

        // Tool services shared by the HTTP /v1/tools endpoints and the MCP
        // server. Scoped because they consume scoped FluentValidation
        // validators.
        services.AddScoped<SpecEditService>();
        services.AddScoped<TaskToolService>();

        return services;
    }
}
