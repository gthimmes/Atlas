import { useEffect, useState } from 'react';
import { Nav } from './components/Nav.js';
import { HealthBadge } from './components/HealthBadge.js';
import { SpecEditor } from './features/specs/SpecEditor.js';
import { WorkGraph } from './features/graph/WorkGraph.js';
import { TaskDetailPanel } from './features/tasks/TaskDetailPanel.js';
import { NewSpecDialog } from './features/specs/NewSpecDialog.js';
import { ProjectsDialog } from './features/projects/ProjectsDialog.js';
import { useProjects } from './features/projects/store.js';
import { HelpDrawer } from './help/HelpDrawer.js';
import { FirstRunModal } from './help/FirstRunModal.js';
import { useHelp } from './help/store.js';
import { resetWorkspace } from './lib/api.js';

type Theme = 'dark' | 'light';
type View = 'graph' | 'spec' | 'run' | 'digest';

// Phase 1: single seeded workspace. The Work Graph picks a spec for the
// editor to land on; Phase 2 adds routing + multi-spec navigation.
const DEFAULT_SPEC_ID = 'spec_s142';

export function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('atlas.theme') as Theme | null) ?? 'dark';
  });
  const [view, setView] = useState<View>(() => {
    return (localStorage.getItem('atlas.view') as View | null) ?? 'graph';
  });
  const [activeSpecId, setActiveSpecId] = useState<string>(
    () => localStorage.getItem('atlas.activeSpec') ?? DEFAULT_SPEC_ID,
  );
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [newSpecOpen, setNewSpecOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  // Bump this to force WorkGraph (and any other list consumer) to refetch
  // after mutations we can't subscribe to (new spec, reset).
  const [workspaceRev, setWorkspaceRev] = useState(0);
  const activeProjectId = useProjects((s) => s.activeProjectId);

  useEffect(() => {
    localStorage.setItem('atlas.theme', theme);
    document.body.className = `theme-${theme}`;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('atlas.view', view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem('atlas.activeSpec', activeSpecId);
  }, [activeSpecId]);

  const openSpec = (id: string) => {
    setActiveSpecId(id);
    setView('spec');
  };

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
        onNewSpec={() => setNewSpecOpen(true)}
        onManageProjects={() => setProjectsOpen(true)}
        onNewProject={() => setProjectsOpen(true)}
      />
      <main
        style={{
          flex: 1,
          minHeight: 0,
          padding: 'var(--s-6)',
          overflow: 'hidden',
          position: 'relative',
        }}
        data-testid={`surface-${view}`}
      >
        {view === 'spec' ? (
          <SpecEditor specId={activeSpecId} />
        ) : view === 'graph' ? (
          <WorkGraph
            key={`${workspaceRev}-${activeProjectId ?? 'all'}`}
            projectId={activeProjectId}
            onOpenSpec={openSpec}
            onOpenTask={setActiveTaskId}
            onCreateFirstSpec={() => setNewSpecOpen(true)}
          />
        ) : (
          <ComingSoon view={view} />
        )}
        {view === 'graph' && activeTaskId && (
          <TaskDetailPanel
            taskId={activeTaskId}
            onClose={() => setActiveTaskId(null)}
            onUpdate={() => {
              /* Phase 2: graph auto-refreshes on next mount. */
            }}
          />
        )}
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
        <span>phase 2</span>
        <span style={{ flex: 1 }} />
        <ResetWorkspaceLink onReset={() => setWorkspaceRev((r) => r + 1)} />
        <FirstRunResetLink />
        <HealthBadge />
      </footer>
      {newSpecOpen && (
        <NewSpecDialog
          onClose={() => setNewSpecOpen(false)}
          onCreated={(id) => {
            setNewSpecOpen(false);
            setActiveSpecId(id);
            setView('spec');
            setWorkspaceRev((r) => r + 1);
          }}
        />
      )}
      {projectsOpen && <ProjectsDialog onClose={() => setProjectsOpen(false)} />}
      <FirstRunModal />
      <HelpDrawer />
    </div>
  );
}

function ResetWorkspaceLink({ onReset }: { onReset: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      data-testid="reset-workspace"
      disabled={busy}
      onClick={async () => {
        if (
          !confirm('Wipe every spec, task, and event in the workspace? Projects and users survive.')
        )
          return;
        setBusy(true);
        try {
          await resetWorkspace();
          onReset();
        } finally {
          setBusy(false);
        }
      }}
      title="Dev-only: truncate specs/tasks/event_log so you can see the empty-state flow"
      style={{
        background: 'transparent',
        border: 'none',
        color: 'var(--fg-3)',
        cursor: 'pointer',
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
      }}
    >
      {busy ? 'resetting…' : 'reset workspace'}
    </button>
  );
}

function FirstRunResetLink() {
  return (
    <button
      data-testid="first-run-reset"
      onClick={() => {
        localStorage.removeItem('atlas.firstRunSeen');
        location.reload();
      }}
      title="Show the welcome modal again (dogfood convenience)"
      style={{
        background: 'transparent',
        border: 'none',
        color: 'var(--fg-3)',
        cursor: 'pointer',
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
      }}
    >
      reset welcome
    </button>
  );
}

function ComingSoon({ view }: { view: View }) {
  const openHelp = useHelp((s) => s.open);
  const copy: Record<View, { heading: string; phase: string; body: string; helpSection: string }> =
    {
      graph: {
        heading: 'Work Graph',
        phase: 'Phase 1+',
        body: 'This surface is live.',
        helpSection: 'reading-work-graph',
      },
      spec: {
        heading: 'Spec Editor',
        phase: 'Phase 1+',
        body: 'This surface is live.',
        helpSection: 'your-first-spec',
      },
      run: {
        heading: 'Agent Run Panel',
        phase: 'Phase 3 — not built yet',
        body: "When it lands: a live view of an agent session. Model, context budget, cost, activity stream (reads · edits · tool calls · decisions · elicitations), and sub-agents spawned. You'll be able to answer elicitations (clarifying questions) here and watch acceptance chips flip in real time.",
        helpSection: 'concepts',
      },
      digest: {
        heading: 'Morning Digest',
        phase: 'Phase 4 — not built yet',
        body: 'When it lands: a batched view of overnight agent work — sessions complete, PRs merged, acceptance criteria status changes, ADRs emitted. One-click approve or request-changes per item. Red-risk merges are surfaced separately.',
        helpSection: 'concepts',
      },
    };
  const l = copy[view];
  return (
    <div
      data-testid={`coming-soon-${view}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 'var(--s-3)',
        color: 'var(--fg-2)',
        maxWidth: 560,
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 'var(--fs-11)',
          color: 'var(--fg-3)',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}
      >
        {l.phase}
      </div>
      <div style={{ fontSize: 'var(--fs-24)', color: 'var(--fg-0)', fontWeight: 600 }}>
        {l.heading}
      </div>
      <p style={{ color: 'var(--fg-1)', lineHeight: 'var(--lh-prose)', margin: 0 }}>{l.body}</p>
      <button
        onClick={() => openHelp(l.helpSection)}
        style={{
          marginTop: 'var(--s-3)',
          padding: '6px 14px',
          background: 'var(--bg-2)',
          color: 'var(--fg-1)',
          border: '1px solid var(--line-2)',
          borderRadius: 'var(--r-2)',
          cursor: 'pointer',
          fontSize: 'var(--fs-12)',
        }}
      >
        Read more about this surface →
      </button>
    </div>
  );
}
