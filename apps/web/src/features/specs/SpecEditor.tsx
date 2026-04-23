import { useEffect, useState } from 'react';
import type { ReadinessBreakdown, Spec } from '@atlas/schema';
import { getSpec, proposeSpecEdit } from '../../lib/api.js';
import { useDebouncedCallback, useSse } from '../../lib/sse.js';
import { ReadinessPanel } from './ReadinessPanel.js';
import { AcceptanceChips } from './AcceptanceChips.js';
import { SpawnTaskDialog } from '../tasks/SpawnTaskDialog.js';

interface Props {
  specId: string;
}

export function SpecEditor({ specId }: Props) {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [intentDraft, setIntentDraft] = useState<string>('');
  const [err, setErr] = useState<string | null>(null);
  const [spawnOpen, setSpawnOpen] = useState(false);

  const liveReadiness = useSse<ReadinessBreakdown>(
    spec ? `/v1/specs/${specId}/readiness` : null,
    'readiness.updated',
  );

  useEffect(() => {
    let cancelled = false;
    setSpec(null);
    setErr(null);
    getSpec(specId)
      .then((s) => {
        if (cancelled) return;
        setSpec(s);
        setIntentDraft(s.intent ?? '');
      })
      .catch((e: Error) => !cancelled && setErr(e.message));
    return () => {
      cancelled = true;
    };
  }, [specId]);

  const pushIntent = useDebouncedCallback((value: string) => {
    proposeSpecEdit(specId, 'intent', { intent: value })
      .then((fresh) => setSpec(fresh))
      .catch((e: Error) => setErr(e.message));
  }, 500);

  if (err) {
    return <SurfaceError message={err} />;
  }
  if (!spec) {
    return <SurfaceLoading />;
  }

  const readiness = liveReadiness ?? spec.readiness_breakdown;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: 'var(--s-6)',
        height: '100%',
      }}
    >
      <div style={{ overflowY: 'auto', paddingRight: 'var(--s-4)' }}>
        <Header spec={spec} onSpawn={() => setSpawnOpen(true)} gated={readiness.gated} />
        <Section title="Intent">
          <textarea
            data-testid="intent-textarea"
            value={intentDraft}
            onChange={(e) => {
              setIntentDraft(e.target.value);
              pushIntent(e.target.value);
            }}
            rows={5}
            style={textareaStyle}
            placeholder="What are we shipping, for whom, and what outcome changes?"
          />
        </Section>
        <Section title="Non-goals">
          <ul style={listStyle}>
            {spec.non_goals.length === 0 ? (
              <li style={{ color: 'var(--fg-3)' }}>No non-goals yet.</li>
            ) : (
              spec.non_goals.map((n, i) => <li key={i}>{n}</li>)
            )}
          </ul>
        </Section>
        <Section title="Constraints">
          <ul style={listStyle}>
            {spec.constraints.length === 0 ? (
              <li style={{ color: 'var(--fg-3)' }}>No constraints yet.</li>
            ) : (
              spec.constraints.map((c) => (
                <li key={c.id}>
                  {c.text}
                  {c.budget ? (
                    <span className="mono" style={{ marginLeft: 8, color: 'var(--fg-2)' }}>
                      {c.budget.metric} {c.budget.op} {c.budget.value}
                      {c.budget.unit}
                    </span>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </Section>
        <Section title="Acceptance">
          <AcceptanceChips criteria={spec.acceptance} />
        </Section>
        <Section title="Open questions">
          <ul style={listStyle}>
            {spec.open_questions.length === 0 ? (
              <li style={{ color: 'var(--fg-3)' }}>No open questions.</li>
            ) : (
              spec.open_questions.map((q) => (
                <li key={q.id}>
                  <span style={{ color: q.blocks_spawn ? 'var(--signal-amber)' : 'var(--fg-2)' }}>
                    {q.blocks_spawn ? '⚠ ' : ''}
                  </span>
                  {q.text}{' '}
                  <span className="mono" style={{ color: 'var(--fg-3)' }}>
                    [{q.state}]
                  </span>
                </li>
              ))
            )}
          </ul>
        </Section>
      </div>
      <ReadinessPanel breakdown={readiness} />
      {spawnOpen && (
        <SpawnTaskDialog
          specId={specId}
          defaultAssignee={spec.owner}
          gated={readiness.gated}
          onClose={() => setSpawnOpen(false)}
          onCreated={() => {
            setSpawnOpen(false);
            // Refresh the spec so task_ids reflect the new row.
            getSpec(specId)
              .then(setSpec)
              .catch((e: Error) => setErr(e.message));
          }}
        />
      )}
    </div>
  );
}

function Header({ spec, onSpawn, gated }: { spec: Spec; onSpawn: () => void; gated: boolean }) {
  return (
    <div
      style={{
        marginBottom: 'var(--s-6)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 'var(--s-4)',
      }}
    >
      <div>
        <div
          className="mono"
          style={{ fontSize: 'var(--fs-11)', color: 'var(--fg-3)', letterSpacing: 0.5 }}
        >
          {spec.id} · v{spec.version} · {spec.status}
        </div>
        <h1 style={{ margin: '4px 0 0 0', fontSize: 'var(--fs-24)', fontWeight: 600 }}>
          {spec.title}
        </h1>
      </div>
      <button
        data-testid="spawn-task-button"
        onClick={onSpawn}
        disabled={gated}
        title={gated ? 'Bring readiness ≥ 70 to spawn tasks' : 'Spawn a new task under this spec'}
        style={{
          padding: '6px 14px',
          background: gated ? 'var(--bg-2)' : 'var(--accent-human)',
          color: gated ? 'var(--fg-3)' : 'var(--bg-0)',
          border: gated ? '1px solid var(--line-2)' : 'none',
          borderRadius: 'var(--r-2)',
          fontSize: 'var(--fs-12)',
          fontWeight: 600,
          cursor: gated ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        + Spawn task
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      data-testid={`section-${title.toLowerCase().replace(/\s/g, '-')}`}
      style={{ marginBottom: 'var(--s-6)' }}
    >
      <h2
        style={{
          fontSize: 'var(--fs-11)',
          fontWeight: 600,
          color: 'var(--fg-3)',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 'var(--s-3)',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function SurfaceLoading() {
  return (
    <div style={{ color: 'var(--fg-2)', textAlign: 'center', padding: 'var(--s-8)' }}>Loading…</div>
  );
}

function SurfaceError({ message }: { message: string }) {
  return (
    <div
      data-testid="spec-error"
      style={{ color: 'var(--signal-red)', textAlign: 'center', padding: 'var(--s-8)' }}
    >
      {message}
    </div>
  );
}

const listStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 'var(--s-5)',
  color: 'var(--fg-1)',
  lineHeight: 1.55,
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 96,
  padding: 'var(--s-3)',
  background: 'var(--bg-1)',
  color: 'var(--fg-0)',
  border: '1px solid var(--line-1)',
  borderRadius: 'var(--r-2)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-13)',
  lineHeight: 1.55,
  resize: 'vertical',
};
