// Help content catalog. Sections are plain markdown files imported as
// strings via Vite's ?raw suffix. Render via renderMarkdown() below.
// To add a section: drop a .md file in this folder and register it here.

import welcome from './welcome.md?raw';
import concepts from './concepts.md?raw';
import readingWorkGraph from './reading-work-graph.md?raw';
import projects from './projects.md?raw';
import yourFirstSpec from './your-first-spec.md?raw';
import acceptance from './acceptance-criteria.md?raw';
import readinessGate from './readiness-gate.md?raw';
import spawningTasks from './spawning-tasks.md?raw';
import shortcuts from './keyboard-shortcuts.md?raw';

import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, breaks: false, linkify: true, typographer: true });

export interface HelpSection {
  id: string;
  title: string;
  body: string; // rendered HTML
  raw: string; // original markdown, useful for testing
}

function section(id: string, title: string, raw: string): HelpSection {
  return { id, title, body: md.render(raw), raw };
}

export const HELP_SECTIONS: HelpSection[] = [
  section('welcome', 'Welcome', welcome),
  section('concepts', 'The 11 primitives in 2 minutes', concepts),
  section('reading-work-graph', 'Reading the Work Graph', readingWorkGraph),
  section('projects', 'Projects', projects),
  section('your-first-spec', 'Your first spec', yourFirstSpec),
  section('acceptance-criteria', 'Acceptance criteria', acceptance),
  section('readiness-gate', 'The readiness gate', readinessGate),
  section('spawning-tasks', 'Spawning tasks', spawningTasks),
  section('keyboard-shortcuts', 'Keyboard shortcuts', shortcuts),
];

export function getSection(id: string): HelpSection | undefined {
  return HELP_SECTIONS.find((s) => s.id === id);
}
