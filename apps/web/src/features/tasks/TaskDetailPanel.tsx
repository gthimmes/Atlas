import { useEffect, useState } from 'react';
import type { Task } from '@atlas/schema';
import { getTask, updateTask } from '../../lib/api.js';

interface Props {
  taskId: string | null;
  onClose: () => void;
  onUpdate?: () => void;
}

const STATUSES = [
  'proposed',
  'ready',
  'in_flight',
  'blocked',
  'review',
  'done',
  'cancelled',
] as const;

export function TaskDetailPanel({ taskId, onClose, onUpdate }: Props) {
  const [task, setTask] = useState<Task | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      return;
    }
    let cancelled = false;
    getTask(taskId)
      .then((t) => !cancelled && setTask(t))
      .catch((e: Error) => !cancelled && setErr(e.message));
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  if (!taskId) return null;

  const setStatus = async (status: string) => {
    if (!task || status === task.status) return;
    setSaving(true);
    try {
      await updateTask({ task: task.id, status });
      const fresh = await getTask(task.id);
      setTask(fresh);
      onUpdate?.();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside
      data-testid="task-detail-panel"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        height: '100%',
        width: 400,
        background: 'var(--bg-1)',
        borderLeft: '1px solid var(--line-1)',
        boxShadow: 'var(--shadow-2)',
        padding: 'var(--s-5)',
        overflowY: 'auto',
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>
          {taskId}
        </span>
        <button
          data-testid="task-detail-close"
          onClick={onClose}
          aria-label="close task detail"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--fg-2)',
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>
      {err && <div style={{ color: 'var(--signal-red)', marginTop: 'var(--s-2)' }}>{err}</div>}
      {!task ? (
        <div style={{ color: 'var(--fg-3)', marginTop: 'var(--s-4)' }}>Loading…</div>
      ) : (
        <>
          <h2 style={{ fontSize: 'var(--fs-20)', margin: 'var(--s-3) 0 var(--s-4)' }}>
            {task.title}
          </h2>
          <Row label="Status">
            <select
              data-testid="task-status-select"
              value={task.status}
              disabled={saving}
              onChange={(e) => setStatus(e.target.value)}
              style={selectStyle}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Assignee">
            <span className="mono">{task.assignee}</span>
          </Row>
          <Row label="Risk">
            <span
              className="mono"
              style={{
                color:
                  task.risk === 'red'
                    ? 'var(--signal-red)'
                    : task.risk === 'amber'
                      ? 'var(--signal-amber)'
                      : 'var(--signal-green)',
              }}
            >
              {task.risk}
            </span>
          </Row>
          <Row label="Description">
            <div>{task.description ?? <span style={{ color: 'var(--fg-3)' }}>none</span>}</div>
          </Row>
          {task.paths.length > 0 && (
            <Row label="Paths">
              <ul className="mono" style={{ margin: 0, paddingLeft: 16, fontSize: 11 }}>
                {task.paths.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Row>
          )}
          {(task.blocks.length > 0 || task.blocked_by.length > 0) && (
            <Row label="Links">
              <div className="mono" style={{ fontSize: 11 }}>
                {task.blocks
                  .map((b) => `blocks ${b}`)
                  .concat(task.blocked_by.map((b) => `blocked by ${b}`))
                  .join(' · ')}
              </div>
            </Row>
          )}
        </>
      )}
    </aside>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 'var(--s-3)' }}>
      <div
        style={{
          fontSize: 'var(--fs-11)',
          fontWeight: 600,
          color: 'var(--fg-3)',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ color: 'var(--fg-1)' }}>{children}</div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '4px 8px',
  background: 'var(--bg-2)',
  color: 'var(--fg-0)',
  border: '1px solid var(--line-2)',
  borderRadius: 'var(--r-2)',
  fontSize: 'var(--fs-13)',
};
