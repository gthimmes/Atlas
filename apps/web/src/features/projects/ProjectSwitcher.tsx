import { useEffect, useRef, useState } from 'react';
import { useProjects } from './store.js';

interface Props {
  workspaceLabel: string;
  onManage: () => void;
  onCreate: () => void;
}

export function ProjectSwitcher({ workspaceLabel, onManage, onCreate }: Props) {
  const { projects, activeProjectId, refresh, setActive } = useProjects();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projects === null) void refresh();
  }, [projects, refresh]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [open]);

  const active = projects?.find((p) => p.id === activeProjectId) ?? null;
  const label = active
    ? `${active.name}`
    : projects === null
      ? '…'
      : projects.length === 0
        ? 'no projects yet'
        : 'select project';

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        data-testid="project-switcher"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: 'transparent',
          border: 'none',
          color: 'var(--fg-3)',
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          cursor: 'pointer',
          padding: 0,
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        / <span style={{ color: 'var(--fg-2)' }}>{workspaceLabel}</span>
        <span style={{ color: 'var(--line-strong)' }}>·</span>
        <span style={{ color: 'var(--fg-1)' }}>{label}</span>
        <svg width="9" height="9" viewBox="0 0 9 9" style={{ marginLeft: 2 }}>
          <path d="M1 3l3.5 3L8 3" stroke="currentColor" strokeWidth="1.4" fill="none" />
        </svg>
      </button>
      {open && (
        <div
          data-testid="project-switcher-menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 6,
            minWidth: 260,
            background: 'var(--bg-1)',
            border: '1px solid var(--line-2)',
            borderRadius: 'var(--r-2)',
            boxShadow: 'var(--shadow-2)',
            zIndex: 60,
            overflow: 'hidden',
          }}
        >
          <div
            className="mono"
            style={{
              padding: '6px var(--s-3)',
              fontSize: 10,
              color: 'var(--fg-3)',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              borderBottom: '1px solid var(--line-1)',
            }}
          >
            Projects
          </div>
          {projects === null ? (
            <div style={{ padding: 'var(--s-3)', color: 'var(--fg-3)', fontSize: 'var(--fs-12)' }}>
              Loading…
            </div>
          ) : projects.length === 0 ? (
            <div style={{ padding: 'var(--s-3)', color: 'var(--fg-3)', fontSize: 'var(--fs-12)' }}>
              No projects yet.
            </div>
          ) : (
            projects.map((p) => (
              <button
                key={p.id}
                data-testid={`project-switcher-item-${p.id}`}
                data-active={p.id === activeProjectId}
                onClick={() => {
                  setActive(p.id);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px var(--s-3)',
                  background: p.id === activeProjectId ? 'var(--bg-3)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--s-2)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ color: 'var(--fg-0)', fontSize: 'var(--fs-12)' }}>{p.name}</span>
                  <span className="mono" style={{ color: 'var(--fg-3)', fontSize: 10 }}>
                    {p.slug}
                  </span>
                </div>
                <span className="mono" style={{ color: 'var(--fg-3)', fontSize: 10 }}>
                  {p.spec_count} {p.spec_count === 1 ? 'spec' : 'specs'}
                </span>
              </button>
            ))
          )}
          <div style={{ borderTop: '1px solid var(--line-1)' }}>
            <button
              data-testid="project-switcher-new"
              onClick={() => {
                setOpen(false);
                onCreate();
              }}
              style={rowBtn}
            >
              + New project
            </button>
            <button
              data-testid="project-switcher-manage"
              onClick={() => {
                setOpen(false);
                onManage();
              }}
              style={rowBtn}
            >
              Manage projects…
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const rowBtn: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '6px var(--s-3)',
  background: 'transparent',
  border: 'none',
  color: 'var(--accent-human)',
  fontSize: 'var(--fs-12)',
  cursor: 'pointer',
};
