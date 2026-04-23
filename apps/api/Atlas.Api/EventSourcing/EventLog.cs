using System.Data;
using System.Text.Json;
using Atlas.Api.Infrastructure;
using Dapper;

namespace Atlas.Api.EventSourcing;

/// <summary>
/// Append-only writer over the `event_log` table. The tool layer calls
/// <see cref="AppendAsync"/> inside the same transaction as the projection
/// write so both succeed atomically or fail together.
/// </summary>
public interface IEventLog
{
    Task<long> AppendAsync<TPayload>(
        IDbConnection conn,
        IDbTransaction tx,
        string aggregateType,
        string aggregateId,
        string kind,
        TPayload payload,
        string actor,
        string actorKind,
        long? causationId = null,
        Guid? correlationId = null,
        CancellationToken ct = default);
}

public sealed class EventLog(JsonSerializerOptions jsonOptions) : IEventLog
{
    public async Task<long> AppendAsync<TPayload>(
        IDbConnection conn,
        IDbTransaction tx,
        string aggregateType,
        string aggregateId,
        string kind,
        TPayload payload,
        string actor,
        string actorKind,
        long? causationId = null,
        Guid? correlationId = null,
        CancellationToken ct = default)
    {
        var payloadJson = JsonSerializer.Serialize(payload, jsonOptions);
        const string sql = """
            INSERT INTO event_log (aggregate_type, aggregate_id, kind, payload, actor, actor_kind, causation_id, correlation_id)
            VALUES (@aggregateType, @aggregateId, @kind, @payload::jsonb, @actor, @actorKind, @causationId, COALESCE(@correlationId, gen_random_uuid()))
            RETURNING id;
            """;

        return await conn.ExecuteScalarAsync<long>(new CommandDefinition(sql, new
        {
            aggregateType,
            aggregateId,
            kind,
            payload = payloadJson,
            actor,
            actorKind,
            causationId,
            correlationId,
        }, transaction: tx, cancellationToken: ct));
    }
}
