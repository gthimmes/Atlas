using System.Text.Json;
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

        // SSE fan-out hub (readiness updates + later: activity streams).
        services.AddSingleton<ISpecReadinessHub, SpecReadinessHub>();

        return services;
    }
}
