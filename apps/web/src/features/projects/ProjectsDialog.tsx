import { useState } from 'react';
import { createProject } from '../../lib/api.js';
import { useProjects } from './store.js';

interface Props {
  onClose: () => void;
}

export function ProjectsDialog({ onClose }: Props) {
  const { projects, refresh, setActive } = useProjects();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const autoSlug = slugify(name);
  const effectiveSlug = slugTouched ? slug : autoSlug;

  const submit = async () => {
    if (!name.trim() || !effectiveSlug) return;
    setSubmitting(true);
    setErr(null);
    try {
      const { id } = await createProject({ name: name.trim(), slug: effectiveSlug });
      await refresh();
      setActive(id);
      setName('');
      setSlug('');
      setSlugTouched(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="projects"
      data-testid="projects-dialog"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 160,
        background: 'var(--scrim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 640,
          maxWidth: '95vw',
          maxHeight: '85vh',
          background: 'var(--bg-1)',
          border: '1px solid var(--line-2)',
          borderRadius: 'var(--r-3)',
          padding: 'var(--s-5)',
          boxShadow: 'var(--shadow-2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s-4)',
        }}
      >
        <header
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
        >
          <h3 style={{ margin: 0, fontSize: 'var(--fs-16)' }}>Projects</h3>
          <button
            onClick={onClose}
            aria-label="close projects"
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
        </header>

        <p style={{ margin: 0, fontSize: 'var(--fs-12)', color: 'var(--fg-2)', lineHeight: 1.5 }}>
          A <strong>project</strong> is the scope for repo refs, trust tiers, and ambient agents. A
          workspace has many projects; a project is 1:1 with a repo (or a meta-repo).
        </p>

        <section
          style={{
            border: '1px solid var(--line-1)',
            borderRadius: 'var(--r-2)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 2fr 1fr 1fr',
              gap: 'var(--s-3)',
              padding: 'var(--s-2) var(--s-3)',
              background: 'var(--bg-2)',
              fontSize: 10,
              color: 'var(--fg-3)',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              fontWeight: 600,
            }}
          >
            <span>Name</span>
            <span>Slug</span>
            <span style={{ textAlign: 'right' }}>Specs</span>
            <span style={{ textAlign: 'right' }}>Created</span>
          </div>
          {projects === null ? (
            <div style={{ padding: 'var(--s-3)', color: 'var(--fg-3)' }}>Loading…</div>
          ) : projects.length === 0 ? (
            <div style={{ padding: 'var(--s-3)', color: 'var(--fg-3)' }}>
              No projects yet. Create one below.
            </div>
          ) : (
            projects.map((p) => (
              <div
                key={p.id}
                data-testid={`projects-row-${p.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 2fr 1fr 1fr',
                  gap: 'var(--s-3)',
                  padding: 'var(--s-2) var(--s-3)',
                  borderTop: '1px solid var(--line-1)',
                  fontSize: 'var(--fs-12)',
                  color: 'var(--fg-1)',
                  alignItems: 'center',
                }}
              >
                <span>{p.name}</span>
                <span className="mono" style={{ color: 'var(--fg-2)' }}>
                  {p.slug}
                </span>
                <span className="mono" style={{ color: 'var(--fg-2)', textAlign: 'right' }}>
                  {p.spec_count}
                </span>
                <span className="mono" style={{ color: 'var(--fg-3)', textAlign: 'right' }}>
                  {new Date(p.created_at).toISOString().slice(0, 10)}
                </span>
              </div>
            ))
          )}
        </section>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 2fr auto',
            gap: 'var(--s-2)',
            alignItems: 'end',
          }}
        >
          <label style={labelStyle}>
            New project name
            <input
              data-testid="projects-new-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Payments"
              style={inputStyle}
              required
            />
          </label>
          <label style={labelStyle}>
            Slug
            <input
              data-testid="projects-new-slug"
              value={effectiveSlug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="auto"
              style={inputStyle}
              pattern="[a-z0-9-]+"
            />
          </label>
          <button
            type="submit"
            data-testid="projects-new-submit"
            disabled={submitting || !name.trim() || !effectiveSlug}
            style={btnPrimary}
          >
            {submitting ? 'Creating…' : '+ Create'}
          </button>
        </form>

        {err && (
          <div style={{ color: 'var(--signal-red)', fontSize: 'var(--fs-12)' }} role="alert">
            {err}
          </div>
        )}
      </div>
    </div>
  );
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
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
  whiteSpace: 'nowrap',
};
