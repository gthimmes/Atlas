import { useEffect } from 'react';
import { useHelp } from '../help/store.js';
import { ProjectSwitcher } from '../features/projects/ProjectSwitcher.js';

type View = 'graph' | 'spec' | 'run' | 'digest';

interface Props {
  view: View;
  onChange: (v: View) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onNewSpec: () => void;
  onManageProjects: () => void;
  onNewProject: () => void;
}

const ITEMS: Array<{ id: View; label: string; kbd: string }> = [
  { id: 'graph', label: 'Work graph', kbd: 'G' },
  { id: 'spec', label: 'Spec', kbd: 'S' },
  { id: 'run', label: 'Agent run', kbd: 'R' },
  { id: 'digest', label: 'Digest', kbd: 'D' },
];

export function Nav({
  view,
  onChange,
  theme,
  onToggleTheme,
  onNewSpec,
  onManageProjects,
  onNewProject,
}: Props) {
  const toggleHelp = useHelp((s) => s.toggle);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        toggleHelp();
        return;
      }
      const m: Record<string, View> = { g: 'graph', s: 'spec', r: 'run', d: 'digest' };
      const next = m[e.key.toLowerCase()];
      if (next) onChange(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onChange, toggleHelp]);

  return (
    <nav
      aria-label="primary"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--s-2)',
        padding: '8px var(--s-4)',
        background: 'var(--bg-1)',
        borderBottom: '1px solid var(--line-1)',
        color: 'var(--fg-0)',
        flexShrink: 0,
        height: 44,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--s-2)',
          paddingRight: 'var(--s-3)',
          borderRight: '1px solid var(--line-1)',
          marginRight: 'var(--s-2)',
        }}
      >
        <Logo />
        <span style={{ fontWeight: 600, fontSize: 'var(--fs-13)', letterSpacing: 0.3 }}>Atlas</span>
        <ProjectSwitcher
          workspaceLabel="meridian"
          onCreate={onNewProject}
          onManage={onManageProjects}
        />
      </div>

      <div style={{ display: 'flex', gap: 2 }}>
        {ITEMS.map((it) => (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            aria-current={view === it.id ? 'page' : undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              background: view === it.id ? 'var(--bg-3)' : 'transparent',
              color: view === it.id ? 'var(--fg-0)' : 'var(--fg-2)',
              border: 'none',
              borderRadius: 'var(--r-2)',
              fontSize: 'var(--fs-12)',
              fontWeight: 500,
            }}
          >
            {it.label}
            <span
              className="mono"
              style={{
                fontSize: 9,
                padding: '1px 4px',
                background: 'var(--bg-0)',
                border: '1px solid var(--line-1)',
                borderRadius: 3,
                color: 'var(--fg-3)',
              }}
            >
              {it.kbd}
            </span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <button
        data-testid="new-spec-button"
        onClick={onNewSpec}
        title="Create a new spec (start from scratch)"
        style={{
          padding: '5px 10px',
          background: 'var(--accent-human)',
          color: 'var(--bg-0)',
          border: 'none',
          borderRadius: 'var(--r-2)',
          fontSize: 'var(--fs-12)',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        + New spec
      </button>

      <button
        data-testid="help-button"
        onClick={() => toggleHelp()}
        aria-label="open help"
        title="Help (press ?)"
        style={{
          padding: '5px 10px',
          background: 'var(--bg-2)',
          color: 'var(--fg-1)',
          border: '1px solid var(--line-1)',
          borderRadius: 'var(--r-2)',
          fontSize: 'var(--fs-12)',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        ?
        <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>
          Help
        </span>
      </button>
      <button
        onClick={onToggleTheme}
        aria-label={`toggle to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        style={{
          padding: '5px 10px',
          background: 'var(--bg-2)',
          color: 'var(--fg-1)',
          border: '1px solid var(--line-1)',
          borderRadius: 'var(--r-2)',
          fontSize: 'var(--fs-11)',
        }}
      >
        {theme === 'dark' ? '● dark' : '○ light'}
      </button>
    </nav>
  );
}

function Logo() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="7" stroke="var(--accent-human)" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="3" fill="var(--accent-agent)" />
      <circle cx="3" cy="4" r="1.2" fill="var(--accent-human)" />
      <circle cx="13" cy="4" r="1.2" fill="var(--accent-human)" />
      <circle cx="3" cy="12" r="1.2" fill="var(--accent-human)" />
      <circle cx="13" cy="12" r="1.2" fill="var(--accent-human)" />
    </svg>
  );
}
