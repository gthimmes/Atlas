import { useState } from 'react';
import { createTask } from '../../lib/api.js';

interface Props {
  specId: string;
  defaultAssignee: string;
  gated: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function SpawnTaskDialog({ specId, defaultAssignee, gated, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [risk, setRisk] = useState<'green' | 'amber' | 'red'>('green');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim() || gated) return;
    setSubmitting(true);
    try {
      const desc = description.trim();
      const { id } = await createTask({
        spec: specId,
        title: title.trim(),
        assignee: defaultAssignee,
        risk,
        ...(desc ? { description: desc } : {}),
      });
      onCreated(id);
    } catch (e) {
      setErr((e as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="spawn task"
      data-testid="spawn-task-dialog"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--scrim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          background: 'var(--bg-1)',
          border: '1px solid var(--line-2)',
          borderRadius: 'var(--r-3)',
          padding: 'var(--s-5)',
          boxShadow: 'var(--shadow-2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s-3)',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 'var(--fs-16)' }}>Spawn task</h3>
        {gated ? (
          <div
            data-testid="spawn-gated-warning"
            style={{
              padding: 'var(--s-2)',
              background: 'var(--bg-2)',
              border: '1px solid var(--signal-amber)',
              borderRadius: 'var(--r-2)',
              color: 'var(--fg-1)',
              fontSize: 'var(--fs-12)',
            }}
          >
            This spec is readiness-gated. Bring readiness ≥ 70 before spawning tasks.
          </div>
        ) : null}

        <label style={labelStyle}>
          Title
          <input
            data-testid="spawn-task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Description
          <textarea
            data-testid="spawn-task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Risk
          <select
            data-testid="spawn-task-risk"
            value={risk}
            onChange={(e) => setRisk(e.target.value as 'green' | 'amber' | 'red')}
            style={inputStyle}
          >
            <option value="green">green</option>
            <option value="amber">amber</option>
            <option value="red">red</option>
          </select>
        </label>
        {err && <div style={{ color: 'var(--signal-red)', fontSize: 'var(--fs-12)' }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s-2)' }}>
          <button onClick={onClose} style={buttonSecondary}>
            Cancel
          </button>
          <button
            data-testid="spawn-task-submit"
            onClick={submit}
            disabled={gated || submitting || !title.trim()}
            style={buttonPrimary}
          >
            {submitting ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 'var(--fs-11)',
  color: 'var(--fg-3)',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const inputStyle: React.CSSProperties = {
  padding: 'var(--s-2) var(--s-3)',
  background: 'var(--bg-2)',
  color: 'var(--fg-0)',
  border: '1px solid var(--line-2)',
  borderRadius: 'var(--r-2)',
  fontSize: 'var(--fs-13)',
  fontFamily: 'var(--font-sans)',
};

const buttonPrimary: React.CSSProperties = {
  padding: '6px 14px',
  background: 'var(--accent-human)',
  color: 'var(--bg-0)',
  border: 'none',
  borderRadius: 'var(--r-2)',
  fontSize: 'var(--fs-12)',
  fontWeight: 600,
  cursor: 'pointer',
};

const buttonSecondary: React.CSSProperties = {
  padding: '6px 14px',
  background: 'var(--bg-2)',
  color: 'var(--fg-1)',
  border: '1px solid var(--line-2)',
  borderRadius: 'var(--r-2)',
  fontSize: 'var(--fs-12)',
  cursor: 'pointer',
};
