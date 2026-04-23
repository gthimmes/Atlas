import { useEffect, useState } from 'react';
import { Nav } from './components/Nav.js';
import { HealthBadge } from './components/HealthBadge.js';

type Theme = 'dark' | 'light';
type View = 'graph' | 'spec' | 'run' | 'digest';

export function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('atlas.theme') as Theme | null) ?? 'dark';
  });
  const [view, setView] = useState<View>(() => {
    return (localStorage.getItem('atlas.view') as View | null) ?? 'graph';
  });

  useEffect(() => {
    localStorage.setItem('atlas.theme', theme);
    document.body.className = `theme-${theme}`;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('atlas.view', view);
  }, [view]);

  return (
    <div
      className={`theme-${theme}`}
      style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
      data-testid="atlas-shell"
    >
      <Nav
        view={view}
        onChange={setView}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />
      <main
        style={{ flex: 1, minHeight: 0, padding: 'var(--s-6)' }}
        data-testid={`surface-${view}`}
      >
        <ComingSoon view={view} />
      </main>
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--s-3)',
          padding: '6px var(--s-4)',
          borderTop: '1px solid var(--line-1)',
          background: 'var(--bg-1)',
          fontSize: 'var(--fs-11)',
          color: 'var(--fg-3)',
        }}
      >
        <span className="mono">atlas</span>
        <span>/</span>
        <span>phase 0</span>
        <span style={{ flex: 1 }} />
        <HealthBadge />
      </footer>
    </div>
  );
}

function ComingSoon({ view }: { view: View }) {
  const labels: Record<View, { heading: string; landsIn: string }> = {
    graph: { heading: 'Work Graph', landsIn: 'Phase 1' },
    spec: { heading: 'Spec Editor', landsIn: 'Phase 1' },
    run: { heading: 'Agent Run Panel', landsIn: 'Phase 3' },
    digest: { heading: 'Morning Digest', landsIn: 'Phase 4' },
  };
  const l = labels[view];
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 'var(--s-3)',
        color: 'var(--fg-2)',
      }}
    >
      <div style={{ fontSize: 'var(--fs-24)', color: 'var(--fg-0)', fontWeight: 600 }}>
        {l.heading}
      </div>
      <div className="mono" style={{ fontSize: 'var(--fs-11)', color: 'var(--fg-3)' }}>
        lands in {l.landsIn}
      </div>
    </div>
  );
}
