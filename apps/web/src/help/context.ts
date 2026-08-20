// Maps the shell's view state to "Suggested for this page" article ids for
// the help-navigator widget. Atlas has no router — the shell switches
// between four views (see App.tsx) — so context is keyed by view, not URL.

const VIEW_CONTEXT: Record<string, string[]> = {
  graph: [
    'reading-the-work-graph',
    'time-scrubber',
    'task-detail-panel',
    'projects-and-switching',
  ],
  spec: ['spec-editor-basics', 'readiness-gate', 'acceptance-criteria', 'spawning-tasks'],
  // Placeholder surfaces: suggest what explains the plan for them.
  run: ['agents-and-mcp', 'the-eleven-primitives'],
  digest: ['agents-and-mcp', 'atlas-in-two-minutes'],
};

const FALLBACK = ['atlas-in-two-minutes'];

/** Suggested article ids for a shell view. Unknown views get the tour. */
export function helpArticlesFor(view: string): string[] {
  return VIEW_CONTEXT[view] ?? FALLBACK;
}

/** Every article id the map can ever emit — used by the integrity tests. */
export function allMappedArticleIds(): string[] {
  return [...new Set([...Object.values(VIEW_CONTEXT).flat(), ...FALLBACK])];
}
