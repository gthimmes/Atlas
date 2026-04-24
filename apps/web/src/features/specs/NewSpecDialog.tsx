import { useEffect, useState } from 'react';
import type { User } from '@atlas/schema';
import { createSpec, listProjects, listUsers, type ProjectSummary } from '../../lib/api.js';

interface Props {
  onClose: () => void;
  onCreated: (specId: string) => void;
}

export function NewSpecDialog({ onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);
  const [project, setProject] = useState<string>('');
  const [owner, setOwner] = useState<string>('');
  const [intent, setIntent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listProjects(), listUsers()])
      .then(([p, u]) => {
        if (cancelled) return;
        setProjects(p.items);
        setUsers(u.items);
        if (p.items[0]) setProject(p.items[0].id);
        if (u.items[0]) setOwner(u.items[0].id);
      })
      .catch((e: Error) => !cancelled && setErr(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    if (!title.trim() || !project || !owner) return;
    setSubmitting(true);
    try {
      const trimmed = intent.trim();
      const { id } = await createSpec({
        title: title.trim(),
        project,
        owner,
        ...(trimmed ? { intent: trimmed } : {}),
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
      aria-label="create spec"
      data-testid="new-spec-dialog"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--scrim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 150,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          maxWidth: '95vw',
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
        <h3 style={{ margin: 0, fontSize: 'var(--fs-16)' }}>Create a new spec</h3>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--fs-12)',
            color: 'var(--fg-2)',
            lineHeight: 'var(--lh-normal)',
          }}
        >
          A spec starts as a draft. It'll be{' '}
          <strong style={{ color: 'var(--signal-amber)' }}>gated</strong> until you add acceptance
          criteria, non-goals, and constraints to reach readiness ≥ 70.
        </p>

        <label style={labelStyle}>
          Title
          <input
            data-testid="new-spec-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Address autocomplete with fallback entry"
            autoFocus
            style={inputStyle}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
          <label style={labelStyle}>
            Project
            <select
              data-testid="new-spec-project"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              style={inputStyle}
              disabled={!projects}
            >
              {!projects ? (
                <option>Loading…</option>
              ) : projects.length === 0 ? (
                <option value="">No projects — create one first</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </label>

          <label style={labelStyle}>
            Owner
            <select
              data-testid="new-spec-owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              style={inputStyle}
              disabled={!users}
            >
              {!users ? (
                <option>Loading…</option>
              ) : users.length === 0 ? (
                <option value="">No users</option>
              ) : (
                users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        <label style={labelStyle}>
          Intent <span style={{ color: 'var(--fg-3)', fontWeight: 400 }}>(optional)</span>
          <textarea
            data-testid="new-spec-intent"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            rows={3}
            placeholder="What outcome changes because of this? Who's it for?"
            style={inputStyle}
          />
        </label>

        {err && <div style={{ color: 'var(--signal-red)', fontSize: 'var(--fs-12)' }}>{err}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s-2)' }}>
          <button onClick={onClose} style={btnSecondary}>
            Cancel
          </button>
          <button
            data-testid="new-spec-submit"
            onClick={submit}
            disabled={submitting || !title.trim() || !project || !owner}
            style={btnPrimary}
          >
            {submitting ? 'Creating…' : 'Create draft'}
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
  fontWeight: 600,
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

const btnPrimary: React.CSSProperties = {
  padding: '6px 14px',
  background: 'var(--accent-human)',
  color: 'var(--bg-0)',
  border: 'none',
  borderRadius: 'var(--r-2)',
  fontSize: 'var(--fs-12)',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '6px 14px',
  background: 'var(--bg-2)',
  color: 'var(--fg-1)',
  border: '1px solid var(--line-2)',
  borderRadius: 'var(--r-2)',
  fontSize: 'var(--fs-12)',
  cursor: 'pointer',
};
