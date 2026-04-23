using System.Collections.Concurrent;
using System.Threading.Channels;
using Atlas.Api.Readiness;

namespace Atlas.Api.Sse;

/// <summary>
/// In-process fan-out for readiness updates. Endpoints subscribe via
/// <see cref="SubscribeAsync"/> and receive a stream until the caller
/// disposes. Mutation code calls <see cref="PublishAsync"/> after commit.
///
/// Phase 1 is single-process; the abstraction exists so Phase 5/6 can swap
/// in a Redis-backed fan-out without touching endpoints.
/// </summary>
public interface ISpecReadinessHub
{
    IAsyncEnumerable<ReadinessEnvelope> SubscribeAsync(string specId, CancellationToken ct);
    ValueTask PublishAsync(string specId, long eventLogId, ReadinessBreakdown breakdown, CancellationToken ct = default);
}

public sealed record ReadinessEnvelope(long EventLogId, string SpecId, ReadinessBreakdown Breakdown);

public sealed class SpecReadinessHub : ISpecReadinessHub
{
    private readonly ConcurrentDictionary<string, List<Channel<ReadinessEnvelope>>> _subscribers = new();

    public async IAsyncEnumerable<ReadinessEnvelope> SubscribeAsync(
        string specId,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        var channel = Channel.CreateBounded<ReadinessEnvelope>(new BoundedChannelOptions(64)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false,
        });

        var list = _subscribers.GetOrAdd(specId, _ => []);
        lock (list) list.Add(channel);

        try
        {
            await foreach (var env in channel.Reader.ReadAllAsync(ct))
                yield return env;
        }
        finally
        {
            lock (list) list.Remove(channel);
            channel.Writer.TryComplete();
        }
    }

    public async ValueTask PublishAsync(string specId, long eventLogId, ReadinessBreakdown breakdown, CancellationToken ct = default)
    {
        if (!_subscribers.TryGetValue(specId, out var list)) return;
        var envelope = new ReadinessEnvelope(eventLogId, specId, breakdown);
        Channel<ReadinessEnvelope>[] snapshot;
        lock (list) snapshot = [.. list];
        foreach (var ch in snapshot)
        {
            await ch.Writer.WriteAsync(envelope, ct);
        }
    }
}
