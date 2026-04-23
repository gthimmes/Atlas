import type { ReadinessBreakdown } from '@atlas/schema';

interface Props {
  breakdown: ReadinessBreakdown;
}

export function ReadinessPanel({ breakdown }: Props) {
  const { components, threshold, gated } = breakdown;
  const score = Math.round(
    components.acceptance_structure.score +
      components.non_goals_present.score +
      components.constraints_specific.score +
      components.open_questions.score +
      components.context_bundle.score,
  );

  const rows = [
    ['Acceptance', components.acceptance_structure],
    ['Non-goals', components.non_goals_present],
    ['Constraints', components.constraints_specific],
    ['Open questions', components.open_questions],
    ['Context bundle', components.context_bundle],
  ] as const;

  return (
    <aside
      data-testid="readiness-panel"
      style={{
        background: 'var(--bg-1)',
        border: '1px solid var(--line-1)',
        borderRadius: 'var(--r-3)',
        padding: 'var(--s-4)',
        height: 'fit-content',
        position: 'sticky',
        top: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 'var(--s-3)',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 'var(--fs-11)',
            color: 'var(--fg-3)',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Readiness
        </h3>
        <span
          data-testid="gate-pill"
          data-gated={gated}
          className="mono"
          style={{
            padding: '2px 8px',
            fontSize: 10,
            borderRadius: 'var(--r-pill)',
            background: gated ? 'var(--signal-amber)' : 'var(--signal-green)',
            color: 'var(--bg-0)',
          }}
        >
          {gated ? 'gated' : 'ready'}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--s-2)',
          marginBottom: 'var(--s-4)',
        }}
      >
        <span
          data-testid="readiness-score"
          style={{ fontSize: 'var(--fs-32)', fontWeight: 600, color: 'var(--fg-0)' }}
        >
          {score}
        </span>
        <span className="mono" style={{ color: 'var(--fg-3)', fontSize: 'var(--fs-12)' }}>
          / 100 (threshold {threshold})
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
        {rows.map(([label, c]) => (
          <ComponentRow key={label} label={label} score={c.score} max={c.max} notes={c.notes} />
        ))}
      </div>
    </aside>
  );
}

function ComponentRow({
  label,
  score,
  max,
  notes,
}: {
  label: string;
  score: number;
  max: number;
  notes: readonly string[];
}) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 'var(--fs-12)',
          color: 'var(--fg-1)',
          marginBottom: 2,
        }}
      >
        <span>{label}</span>
        <span className="mono" style={{ color: 'var(--fg-2)' }}>
          {Math.round(score)}/{max}
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: 'var(--bg-3)',
          borderRadius: 'var(--r-pill)',
          overflow: 'hidden',
          marginBottom: 2,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: pct >= 100 ? 'var(--signal-green)' : 'var(--accent-human)',
            transition: 'width var(--dur-med) var(--ease)',
          }}
        />
      </div>
      {notes.length > 0 && (
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>
          {notes[0]}
        </div>
      )}
    </div>
  );
}
