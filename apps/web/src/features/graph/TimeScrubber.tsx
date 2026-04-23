import { useMemo } from 'react';
import type { Task } from '@atlas/schema';

interface Props {
  tasks: readonly Task[];
  value: Date | null;
  onChange: (d: Date | null) => void;
}

// Phase 2: simple slider from (now - 7 days) to now. null = "now" = show all.
// Phase 5 will upgrade this to an event_log replay so the whole graph state
// (including readiness + spec versions) reflects the selected timestamp.

export function TimeScrubber({ value, onChange }: Props) {
  const { now, min, ticks } = useMemo(() => {
    const now = Date.now();
    const min = now - 7 * 24 * 60 * 60 * 1000;
    const ticks: { label: string; ms: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const t = now - i * 24 * 60 * 60 * 1000;
      ticks.push({ label: i === 0 ? 'now' : `-${i}d`, ms: t });
    }
    return { now, min, ticks };
  }, []);

  const currentMs = value ? value.getTime() : now;

  return (
    <div
      data-testid="time-scrubber"
      style={{
        borderTop: '1px solid var(--line-1)',
        padding: 'var(--s-3) var(--s-4)',
        background: 'var(--bg-1)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--s-4)',
      }}
    >
      <span
        className="mono"
        style={{ fontSize: 10, color: 'var(--fg-3)', width: 72, flexShrink: 0 }}
      >
        as of
      </span>
      <input
        type="range"
        min={min}
        max={now}
        step={60 * 60 * 1000}
        value={currentMs}
        onChange={(e) => {
          const ms = Number(e.target.value);
          onChange(ms >= now ? null : new Date(ms));
        }}
        data-testid="time-scrubber-range"
        style={{ flex: 1 }}
      />
      <span
        className="mono"
        data-testid="time-scrubber-value"
        style={{ fontSize: 10, color: 'var(--fg-2)', width: 160, textAlign: 'right' }}
      >
        {value ? formatRelative(value, now) : 'now'}
      </span>
    </div>
  );
}

function formatRelative(d: Date, nowMs: number): string {
  const diffMs = nowMs - d.getTime();
  const hours = Math.round(diffMs / (60 * 60 * 1000));
  if (hours < 1) return 'now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ${Math.round(hours % 24)}h ago`;
}
