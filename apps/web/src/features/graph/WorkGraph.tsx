import { useEffect, useState } from 'react';
import type { Spec, Task } from '@atlas/schema';
import { listSpecs, listTasks } from '../../lib/api.js';

interface Props {
  onOpenSpec: (id: string) => void;
}

// Phase 1: read-only force-lite graph. Specs as large nodes on the left,
// their tasks in a stack to the right, edges drawn as simple lines. Phase 2
// upgrades to react-flow with drag + time-scrub.

export function WorkGraph({ onOpenSpec }: Props) {
  const [specs, setSpecs] = useState<Spec[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listSpecs(), listTasks()])
      .then(([s, t]) => {
        if (cancelled) return;
        setSpecs(s.items);
        setTasks(t.items);
      })
      .catch((e: Error) => !cancelled && setErr(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    return (
      <div data-testid="graph-error" style={{ color: 'var(--signal-red)', padding: 'var(--s-6)' }}>
        {err}
      </div>
    );
  }
  if (!specs || !tasks) {
    return <div style={{ color: 'var(--fg-2)', padding: 'var(--s-6)' }}>Loading graph…</div>;
  }

  if (specs.length === 0) {
    return (
      <div data-testid="graph-empty" style={{ color: 'var(--fg-3)', padding: 'var(--s-6)' }}>
        No specs in this workspace yet.
      </div>
    );
  }

  const tasksBySpec = new Map<string, Task[]>();
  for (const t of tasks) {
    const list = tasksBySpec.get(t.parent_spec) ?? [];
    list.push(t);
    tasksBySpec.set(t.parent_spec, list);
  }

  return (
    <div
      data-testid="work-graph"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-6)',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      {specs.map((spec) => (
        <SpecRow
          key={spec.id}
          spec={spec}
          tasks={tasksBySpec.get(spec.id) ?? []}
          onOpenSpec={onOpenSpec}
        />
      ))}
    </div>
  );
}

function SpecRow({
  spec,
  tasks,
  onOpenSpec,
}: {
  spec: Spec;
  tasks: readonly Task[];
  onOpenSpec: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 'var(--s-4)', alignItems: 'stretch' }}>
      <button
        data-testid={`graph-spec-${spec.id}`}
        onClick={() => onOpenSpec(spec.id)}
        style={specNodeStyle(spec.readiness_breakdown.gated)}
      >
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>
          {spec.id} · {spec.status}
        </div>
        <div style={{ fontSize: 'var(--fs-14)', fontWeight: 600, marginTop: 4 }}>{spec.title}</div>
        <div style={{ display: 'flex', gap: 'var(--s-2)', marginTop: 6, alignItems: 'center' }}>
          <span
            className="mono"
            style={{
              padding: '1px 7px',
              borderRadius: 'var(--r-pill)',
              background: spec.readiness_breakdown.gated
                ? 'var(--signal-amber)'
                : 'var(--signal-green)',
              color: 'var(--bg-0)',
              fontSize: 10,
            }}
          >
            {spec.readiness_score}/100
          </span>
          <span className="mono" style={{ color: 'var(--fg-3)', fontSize: 10 }}>
            {tasks.length} task{tasks.length === 1 ? '' : 's'}
          </span>
        </div>
      </button>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--s-2)',
          flex: 1,
          alignContent: 'flex-start',
        }}
      >
        {tasks.map((t) => (
          <TaskChip key={t.id} task={t} />
        ))}
      </div>
    </div>
  );
}

function TaskChip({ task }: { task: Task }) {
  const riskBg: Record<string, string> = {
    green: 'var(--signal-green)',
    amber: 'var(--signal-amber)',
    red: 'var(--signal-red)',
  };
  return (
    <div
      data-testid={`graph-task-${task.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: 'var(--s-2) var(--s-3)',
        background: 'var(--bg-1)',
        border: '1px solid var(--line-1)',
        borderRadius: 'var(--r-2)',
        minWidth: 180,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: riskBg[task.risk],
            flexShrink: 0,
          }}
        />
        <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>
          {task.id}
        </span>
      </div>
      <div style={{ fontSize: 'var(--fs-12)', color: 'var(--fg-1)' }}>{task.title}</div>
      <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>
        {task.status}
      </div>
    </div>
  );
}

function specNodeStyle(gated: boolean): React.CSSProperties {
  return {
    textAlign: 'left',
    minWidth: 220,
    padding: 'var(--s-3) var(--s-4)',
    background: 'var(--bg-1)',
    border: `1px solid ${gated ? 'var(--signal-amber)' : 'var(--line-2)'}`,
    borderRadius: 'var(--r-3)',
    color: 'var(--fg-0)',
    cursor: 'pointer',
  };
}
