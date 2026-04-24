import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App.js';
import { useProjects } from './features/projects/store.js';

// The App now calls fetch via SpecEditor/WorkGraph depending on view.
// Stub fetch with responses keyed by URL so each test is deterministic.
const stubFetch = () => {
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.startsWith('/v1/health')) return new Response('{"status":"ok"}', { status: 200 });
    if (url.startsWith('/v1/specs') && url.endsWith('readiness')) {
      return new Response(JSON.stringify(stubReadiness), { status: 200 });
    }
    if (/\/v1\/specs\/[^/]+$/.test(url)) {
      return new Response(JSON.stringify(stubSpec), { status: 200 });
    }
    if (url.startsWith('/v1/specs')) {
      return new Response(JSON.stringify({ items: [stubSpec], next_cursor: null }), {
        status: 200,
      });
    }
    if (url.startsWith('/v1/tasks')) {
      return new Response(JSON.stringify({ items: [], next_cursor: null }), { status: 200 });
    }
    if (url.startsWith('/v1/projects')) {
      return new Response(
        JSON.stringify({
          items: [
            {
              id: 'prj_core',
              workspace: 'ws_meridian',
              slug: 'core',
              name: 'Core',
              created_at: '2026-04-23T00:00:00Z',
              spec_count: 1,
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (url.startsWith('/v1/users')) {
      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    }
    return new Response('{}', { status: 200 });
  });
  vi.stubGlobal('fetch', fn);
  // EventSource is not implemented in jsdom; noop it.
  vi.stubGlobal(
    'EventSource',
    class {
      constructor() {}
      addEventListener() {}
      removeEventListener() {}
      close() {}
      onerror: ((e: unknown) => void) | null = null;
    },
  );
};

const stubReadiness = {
  weights: {
    acceptance_structure: 40,
    non_goals_present: 20,
    constraints_specific: 20,
    open_questions: 10,
    context_bundle: 10,
  },
  components: {
    acceptance_structure: { score: 0, max: 40, notes: [] },
    non_goals_present: { score: 0, max: 20, notes: [] },
    constraints_specific: { score: 0, max: 20, notes: [] },
    open_questions: { score: 10, max: 10, notes: [] },
    context_bundle: { score: 0, max: 10, notes: [] },
  },
  threshold: 70,
  gated: true,
  score: 10,
  computed_at: '2026-04-23T00:00:00Z',
};

const stubSpec = {
  id: 'spec_s142',
  workspace: 'ws_meridian',
  project: 'prj_core',
  pitch: null,
  parent_spec: null,
  title: 'Seeded spec',
  slug: 'seeded',
  status: 'draft',
  version: 1,
  head_sha: '0000000',
  intent: null,
  non_goals: [],
  constraints: [],
  acceptance: [],
  decisions: [],
  open_questions: [],
  context_bundle: null,
  readiness_score: 10,
  readiness_breakdown: stubReadiness,
  task_ids: [],
  actor_summary: { humans: [], agents: [] },
  repo_path: null,
  owner: 'usr_dani',
  created_at: '2026-04-23T00:00:00Z',
  created_by: 'usr_dani',
  updated_at: '2026-04-23T00:00:00Z',
  shipped_at: null,
};

describe('<App />', () => {
  beforeEach(() => {
    localStorage.clear();
    useProjects.setState({
      projects: null,
      activeProjectId: null,
      loading: false,
      error: null,
    });
    stubFetch();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders the nav + default Work Graph surface', async () => {
    render(<App />);
    expect(screen.getByTestId('atlas-shell')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Work graph/i })).toBeInTheDocument();
    // The list stub returns one spec, so the full graph renders.
    await waitFor(() => expect(screen.getByTestId('work-graph')).toBeInTheDocument());
  });

  it('exposes a + New spec button in the nav', () => {
    render(<App />);
    expect(screen.getByTestId('new-spec-button')).toBeInTheDocument();
  });

  it('renders a project switcher with the active project label', async () => {
    render(<App />);
    const switcher = screen.getByTestId('project-switcher');
    expect(switcher).toBeInTheDocument();
    await waitFor(() => expect(switcher).toHaveTextContent(/Core/));
  });

  it('toggles theme when the badge is clicked', async () => {
    render(<App />);
    const shell = screen.getByTestId('atlas-shell');
    const initial = shell.className;
    fireEvent.click(screen.getByRole('button', { name: /toggle to/i }));
    expect(shell.className).not.toBe(initial);
  });

  it('switches surface when a nav item is activated', async () => {
    render(<App />);
    const nav = screen.getByRole('navigation');
    fireEvent.click(within(nav).getByRole('button', { name: /^Spec\b/i }));
    expect(screen.getByTestId('surface-spec')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('readiness-panel')).toBeInTheDocument());
  });
});
