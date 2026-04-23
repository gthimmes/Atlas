import { useEffect, useState } from 'react';

type Status = 'unknown' | 'ok' | 'degraded' | 'error';

interface Health {
  api: Status;
  db: Status;
}

export function HealthBadge() {
  const [h, setH] = useState<Health>({ api: 'unknown', db: 'unknown' });

  useEffect(() => {
    const tick = async () => {
      const [api, db] = await Promise.all([probe('/v1/health'), probe('/v1/health/db')]);
      setH({ api, db });
    };
    void tick();
    const interval = window.setInterval(tick, 10_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <span
      data-testid="health-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--s-2)',
        fontSize: 'var(--fs-11)',
      }}
    >
      <Dot status={h.api} />
      <span>api</span>
      <Dot status={h.db} />
      <span>db</span>
    </span>
  );
}

function Dot({ status }: { status: Status }) {
  const color: Record<Status, string> = {
    unknown: 'var(--fg-3)',
    ok: 'var(--signal-green)',
    degraded: 'var(--signal-amber)',
    error: 'var(--signal-red)',
  };
  return (
    <span
      data-status={status}
      style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: color[status],
        display: 'inline-block',
      }}
    />
  );
}

async function probe(path: string): Promise<Status> {
  try {
    const res = await fetch(path, { headers: { accept: 'application/json' } });
    if (res.status === 503) return 'error';
    if (!res.ok) return 'degraded';
    const body = (await res.json()) as { status?: string };
    return (body.status as Status) ?? 'ok';
  } catch {
    return 'error';
  }
}
