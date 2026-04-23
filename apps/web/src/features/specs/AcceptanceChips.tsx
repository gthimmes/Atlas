import type { AcceptanceCriterion } from '@atlas/schema';
import { WhatsThis } from '../../help/WhatsThis.js';

const COLOR: Record<string, string> = {
  unverified: 'var(--fg-3)',
  generated: 'var(--accent-mixed)',
  passing: 'var(--signal-green)',
  failing: 'var(--signal-red)',
  flaky: 'var(--signal-amber)',
};

export function AcceptanceChips({ criteria }: { criteria: readonly AcceptanceCriterion[] }) {
  if (criteria.length === 0) {
    return <div style={{ color: 'var(--fg-3)' }}>No acceptance criteria yet.</div>;
  }
  return (
    <ul data-testid="acceptance-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {criteria.map((c) => (
        <li
          key={c.id}
          data-testid={`acceptance-${c.id}`}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--s-3)',
            padding: 'var(--s-2) 0',
            borderBottom: '1px dashed var(--line-1)',
          }}
        >
          <StatusChip status={c.status} />
          <div style={{ flex: 1 }}>
            <div>{c.statement}</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 2 }}>
              {c.test_type}
              {c.flakiness_score > 0 ? ` · flaky ${(c.flakiness_score * 100).toFixed(0)}%` : ''}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function StatusChip({ status }: { status: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
      <span
        data-status={status}
        className="mono"
        style={{
          padding: '1px 8px',
          fontSize: 10,
          borderRadius: 'var(--r-pill)',
          color: 'var(--bg-0)',
          background: COLOR[status] ?? COLOR.unverified,
          whiteSpace: 'nowrap',
        }}
      >
        {status}
      </span>
      {status === 'unverified' || status === 'flaky' ? (
        <WhatsThis
          section="acceptance-criteria"
          summary={
            status === 'flaky'
              ? 'Flaky: rolling pass/fail ≥ 20% variance. Investigate before trusting.'
              : 'Unverified: no test run yet. The statement exists but nothing executed against it.'
          }
          label={`about ${status}`}
        />
      ) : null}
    </span>
  );
}
