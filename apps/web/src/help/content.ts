import type { HelpContent } from 'help-navigator';

// The in-app help corpus for the help-navigator widget (floating launcher,
// F1). Grounded in what the app does *today* — Phase 2 surfaces plus the
// Phase 3.1 MCP endpoint. The "Agent run" and "Digest" tabs are honest
// placeholders and are described as such. The quick-reference drawer
// (`?`, src/help/*.md) is a separate, complementary surface.
export const helpContent: HelpContent = {
  categories: [
    {
      id: 'getting-started',
      title: 'Getting started',
      icon: '🧭',
      description: 'What Atlas is, the vocabulary, the demo workspace, and the keyboard.',
    },
    {
      id: 'work-graph',
      title: 'The Work Graph',
      icon: '🕸️',
      description: 'Reading the default view: spec tiles, task chips, edges, and the time scrubber.',
    },
    {
      id: 'specs',
      title: 'Specs & readiness',
      icon: '📐',
      description: 'The Spec Editor, the readiness formula, and acceptance criteria.',
    },
    {
      id: 'tasks',
      title: 'Tasks',
      icon: '🧩',
      description: 'Spawning tasks, the status state machine, risk levels, and the detail panel.',
    },
    {
      id: 'agents',
      title: 'Agents & MCP',
      icon: '🤖',
      description: 'How agents connect over MCP today, and what lands in later phases.',
    },
  ],
  articles: [
    // ---------- Getting started ----------
    {
      id: 'atlas-in-two-minutes',
      title: 'Atlas in two minutes',
      category: 'getting-started',
      featured: true,
      tags: ['overview', 'tour', 'basics', 'spec-native', 'phases'],
      body: `Atlas is a **spec-native** workspace: the unit of work is a *spec* — a structured document with intent, non-goals, constraints, and acceptance criteria — not a ticket. Humans and (increasingly) agents collaborate on specs as equal first-class actors.

## The two live surfaces

- **Work Graph** (\`G\`) — the default view. Specs and their tasks as a graph, because a graph is the honest shape of work when several actors run in parallel.
- **Spec Editor** (\`S\`) — one spec's sections, version, and a live readiness score.

The **Agent run** (\`R\`) and **Digest** (\`D\`) tabs are visible but not built yet — they land in Phases 3 and 4. Each shows a placeholder describing what's coming.

## The core loop today

1. Create a spec (**+ New spec** in the top nav)
2. Raise its **readiness score** past the threshold (default 70)
3. **Spawn tasks** from the ungated spec and move them through the state machine
4. Watch it all on the Work Graph — including edits made live by an agent over MCP

> Press **F1** anytime to open this help center, or **?** for the quick-reference drawer.`,
      related: ['the-eleven-primitives', 'reading-the-work-graph', 'readiness-gate'],
    },
    {
      id: 'the-eleven-primitives',
      title: 'The eleven primitives',
      category: 'getting-started',
      tags: ['concepts', 'vocabulary', 'primitives', 'model'],
      body: `Every object in Atlas is one of eleven types. Three of them carry almost everything you do today:

- **Spec** — the unit of work. Structured doc with intent, non-goals, constraints, acceptance criteria, and open questions. Versioned like code.
- **Acceptance criterion** — a testable claim inside a spec, with a status chip (*unverified · generated · passing · failing · flaky*).
- **Task** — an actionable slice of a spec, assigned to an accountable human, with a risk level and a status state machine.

## Already real, behind the scenes

- **Work Graph** — the projection of specs and tasks as a DAG; the default view.
- **Agent identity** — agents authenticate to the MCP endpoint with bearer tokens and their edits are attributed in the event log.

## Later phases

**Agent session**, **verification evidence**, and **context bundle** (Phase 3+), **pitch** and **living artifact** (Phase 5), **decision/ADR** and **constitution** (Phase 5–6). You'll see these names in placeholders and docs, but they have no UI yet.`,
      related: ['atlas-in-two-minutes', 'acceptance-criteria', 'agents-and-mcp'],
    },
    {
      id: 'demo-workspace-and-reset',
      title: 'The demo workspace, reset & seed',
      category: 'getting-started',
      tags: ['demo', 'meridian', 'reset', 'seed', 'empty-state'],
      body: `Atlas boots with the **Meridian Payments** demo workspace — a fintech running a "risk-aware auto-merge" bet — so every surface has something to show.

## Starting from zero

1. Click **reset workspace** in the footer (dev-only). It wipes specs, tasks, and the event log, but keeps the workspace, users, projects, and agents.
2. The Work Graph shows its empty state with a **+ Create your first spec** button.
3. Create a spec and you're off — the seeded \`Core\` project survives the reset.

To restore the demo data, run \`make seed\` from a terminal.

## Other footer conveniences

- **reset welcome** re-shows the first-run welcome modal.
- The **health badge** at the far right pings the API (\`/v1/health\`) so you can tell a dead backend from an empty workspace.`,
      related: ['atlas-in-two-minutes', 'projects-and-switching', 'spawning-tasks'],
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard shortcuts',
      category: 'getting-started',
      tags: ['shortcuts', 'keys', 'hotkey', 'navigation'],
      body: `## Navigation

- \`G\` — Work Graph
- \`S\` — Spec Editor (for the active spec)
- \`R\` — Agent run *(placeholder until Phase 3)*
- \`D\` — Digest *(placeholder until Phase 4)*

Single-letter shortcuts are suppressed while you're typing in an input or textarea.

## Help

- \`F1\` — open or close **this help center** (search, categories, suggested articles)
- \`?\` — the quick-reference help drawer
- \`Esc\` — close panels and dialogs

## Coming later

Global search (\`Ctrl+K\`), form submit (\`Ctrl+Enter\`), and undo via event-log replay are planned for later phases — they don't work yet.`,
      related: ['atlas-in-two-minutes', 'reading-the-work-graph'],
    },

    // ---------- The Work Graph ----------
    {
      id: 'reading-the-work-graph',
      title: 'Reading the Work Graph',
      category: 'work-graph',
      featured: true,
      tags: ['graph', 'nodes', 'edges', 'chips', 'readiness-pill'],
      body: `The Work Graph is the default view: every spec in the active project as a tile, its tasks as chips, and dependencies as edges.

## Spec tiles

A tile like \`spec_s142 · in_flight · Risk-aware auto-merge for L2 agents\` shows:

- The **ID** — prefixes (\`spec_\`, \`task_\`, \`usr_\`) distinguish types everywhere in Atlas
- The **status** — one of *draft · shaped · ready · in_flight · shipped · archived*
- The **readiness pill** (e.g. **92/100**) — green when the score clears the workspace threshold (spawning allowed), amber when the spec is still **gated**
- The **version** (e.g. \`v14\`) — every edit bumps it

Click a tile to open that spec in the **Spec Editor**.

## Task chips and edges

Each chip is a task: the dot color is its **risk** (green/amber/red) and the label its **status**. Click a chip to open the **task detail panel**. A dashed amber **blocks** edge between tasks means the downstream task can't start until the blocker closes.

## Canvas controls

Pan, zoom, and fit-to-view live at the bottom-left; the **time scrubber** sits at the bottom.`,
      related: ['time-scrubber', 'task-detail-panel', 'readiness-gate'],
    },
    {
      id: 'time-scrubber',
      title: 'The time scrubber',
      category: 'work-graph',
      tags: ['time', 'scrubber', 'history', 'filter', 'replay'],
      body: `The slider at the bottom of the Work Graph filters tasks by **creation time** over the last 7 days. Drag it left to hide tasks created after the chosen timestamp — a quick answer to *"what did yesterday's graph look like?"*.

## What it does today

It's a client-side filter on task \`created_at\`. Specs stay visible; only task chips (and their edges) drop out as you scrub back.

## What it becomes

Atlas is event-sourced — every mutation appends to an event log. In Phase 5 the scrubber upgrades to full **replay**: the entire graph, including readiness scores and spec versions, reconstructs exactly as it was at the chosen moment. The UI affordance you're learning now is the same one that will drive that.`,
      related: ['reading-the-work-graph', 'the-eleven-primitives'],
    },
    {
      id: 'projects-and-switching',
      title: 'Projects & the project switcher',
      category: 'work-graph',
      tags: ['projects', 'switcher', 'slug', 'filter', 'create'],
      body: `A **project** is the scope between workspace and spec — think one repo, or a meta-repo bundling related repos. Each spec belongs to exactly one project.

## The switcher

The breadcrumb next to the Atlas logo is the **project switcher**:

- **Change the active project** — filters the Work Graph to that project's specs (persisted in localStorage)
- **+ New project** — inline create; the slug auto-generates from the name (lowercase \`a-z0-9-\`), and slug collisions are rejected
- **Manage projects** — the full list with spec counts and an inline create form

The seeded workspace ships with one project, \`Core\` (\`prj_core\`). It survives a workspace reset.

## Why more than one project?

Multiple repos, or (from Phase 3+) different agent **trust tiers** per codebase — an agent can be trusted in one project and read-only in another. Note: v1 doesn't support moving specs between projects, so pick deliberately.`,
      related: ['demo-workspace-and-reset', 'reading-the-work-graph'],
    },

    // ---------- Specs & readiness ----------
    {
      id: 'spec-editor-basics',
      title: 'The Spec Editor: intent, versions, live readiness',
      category: 'specs',
      featured: true,
      tags: ['spec', 'editor', 'intent', 'versions', 'sse', 'live'],
      body: `Press \`S\` (or click a spec tile) to open the Spec Editor: the spec's sections on the left, the **readiness panel** on the right.

## What you can edit in-UI today

The **intent** textarea is live — edits autosave (debounced) through the same section-scoped \`spec.propose_edit\` tool that agents use, and each accepted edit bumps the spec's version. Non-goals, constraints, acceptance criteria, and open questions render read-only in Phase 2; they're edited via the API (or by agents over MCP) until later phases bring them into the UI.

## The readiness panel is live

The score subscribes to the server over **SSE**. When *anything* edits the spec — you, a teammate, or an agent over MCP — the score and the section contents update in place, no refresh. Run \`make demo-agent\` and watch it climb.

## Spawning

Once the spec clears the readiness threshold, the **+ Spawn task** button in the header activates. On a gated spec it stays disabled — and the server would reject the attempt anyway.`,
      related: ['readiness-gate', 'acceptance-criteria', 'spawning-tasks', 'agents-and-mcp'],
    },
    {
      id: 'readiness-gate',
      title: 'The readiness gate',
      category: 'specs',
      featured: true,
      tags: ['readiness', 'gate', 'score', 'threshold', 'formula', 'gated'],
      body: `Every spec has a **readiness score** from 0–100. Below the workspace threshold (default **70**) the spec is **gated**: task creation is rejected with \`E_POLICY_DENIED\`. The gate forces specs to be well-formed before anyone — human or agent — builds against them.

## The formula (five weighted components)

- **Acceptance structure — 40**: full credit at ≥ 3 criteria with at least one \`property\` or \`integration\` test type
- **Non-goals — 20**: ≥ 2 non-goals, each ≥ 5 words (shorter ones don't count, on purpose)
- **Constraints — 20**: ≥ 1 constraint with a numeric budget (metric + operator + value + unit, e.g. *p95 < 120ms*)
- **Open questions — 10**: no unresolved questions marked \`blocks_spawn\`
- **Context bundle — 10**: attached and within the token ceiling *(lands with Phase 3)*

Partial credit is linear. An **empty draft scores 10** — no blocking questions gives full marks on that one component — and is still gated.

## The fastest path past 70

Three acceptance criteria (one \`property\`/\`integration\`) **+40**, two real non-goals **+20**, one budgeted constraint **+20** → 90.

Workspace admins can tune the threshold (50–90 in 5-point steps) and the weights.`,
      related: ['acceptance-criteria', 'spawning-tasks', 'spec-editor-basics'],
    },
    {
      id: 'acceptance-criteria',
      title: 'Acceptance criteria & status chips',
      category: 'specs',
      tags: ['acceptance', 'criteria', 'chips', 'test-types', 'property', 'integration'],
      body: `Acceptance criteria are the most load-bearing primitive in Atlas: each is a **testable claim**, and "done" means its test passes — not that a human clicked *close*.

## Status chips

- \`unverified\` — no test reference yet; the statement exists, automation doesn't
- \`generated\` — an agent proposed a test that hasn't run (or hasn't been accepted)
- \`passing\` / \`failing\` — the latest run's verdict on the current commit
- \`flaky\` — rolling flakiness ≥ 20% over recent runs

## Test types

Each criterion declares a \`test_type\`: **property** (randomized invariant — strongest signal), **integration**, **bdd**, **manual**, or **eval**. The readiness formula rewards \`property\` and \`integration\`: without at least one, the acceptance component caps at 32/40.

## Why chips instead of diffs

Atlas's bet on the review bottleneck: reviewers should review **criterion satisfaction**, not raw diffs. A spec with three green \`property\`/\`integration\` chips is merge-worthy; five \`unverified\` chips are not, no matter how good the diff looks.`,
      related: ['readiness-gate', 'spec-editor-basics', 'the-eleven-primitives'],
    },

    // ---------- Tasks ----------
    {
      id: 'spawning-tasks',
      title: 'Spawning tasks',
      category: 'tasks',
      featured: true,
      tags: ['tasks', 'spawn', 'assignee', 'risk', 'paths', 'gate'],
      body: `A task is an actionable slice of a spec: one accountable human, a risk level, and a status that moves through a state machine.

## The gate comes first

**+ Spawn task** (in the Spec Editor header) only works on an ungated spec. The server rejects \`task.create\` on a gated spec with \`E_POLICY_DENIED\` — the same rule applies to agents calling the tool over MCP.

## The form

- **Title** (required, ≤ 200 chars) and an optional description
- **Assignee** — required, always a *human*; agents work on behalf of owners, never in place of them
- **Risk** — \`green\`, \`amber\`, or \`red\`, set by hand in Phase 2 (a rules-based classifier takes over in Phase 4)
- **Paths** — repo paths the task touches; fuel for the future risk classifier and trust policies

## Risk, roughly

Green: small change on low-risk paths. Amber: public API, larger diffs, dev-only deps. Red: \`auth/\`, \`payments/\`, \`migrations/\`, PII, schema changes, new production dependencies — red always means human review, whatever an agent's trust tier.`,
      related: ['readiness-gate', 'task-lifecycle-and-risk', 'task-detail-panel'],
    },
    {
      id: 'task-lifecycle-and-risk',
      title: 'Task lifecycle: the state machine',
      category: 'tasks',
      tags: ['status', 'state-machine', 'transitions', 'blocked', 'blocks'],
      body: `Task statuses move through an enforced state machine:

\`proposed → ready → in_flight → review → done\`

with \`blocked\` reachable from \`ready\`/\`in_flight\`, \`cancelled\` reachable from most non-terminal states, and \`review → in_flight\` for rework. \`done\` and \`cancelled\` are terminal. Illegal jumps — say \`proposed\` straight to \`done\` — are rejected by the server with \`E_POLICY_DENIED\`, whether the request comes from the UI or from an agent over MCP. Moving to \`done\` auto-sets the completion timestamp.

## blocks / blocked_by

Tasks can block each other; the Work Graph draws a dashed amber **blocks** edge. A task with an unresolved blocker sits in \`blocked\` until the blocking task closes.

## Risk dots

The chip's dot color is the task's risk (green/amber/red) — set manually today, classified automatically from Phase 4, when red tasks will also force human review regardless of agent trust.`,
      related: ['spawning-tasks', 'task-detail-panel', 'reading-the-work-graph'],
    },
    {
      id: 'task-detail-panel',
      title: 'The task detail panel',
      category: 'tasks',
      tags: ['task', 'panel', 'detail', 'update-status'],
      body: `Click any task chip on the Work Graph and the detail panel slides in from the right: the task's ID, title, description, assignee, risk, paths, and current status.

## Changing status

The panel's status control drives \`task.update\`. Only **legal transitions** succeed — the server enforces the state machine and answers illegal moves with \`E_POLICY_DENIED\`, which the panel surfaces as an error rather than silently failing. That's deliberate: the UI and agents get exactly the same rules.

## Closing

Press \`Esc\` or the ✕ to close. The graph picks up your status change on its next refresh — chips re-render with the new status label.`,
      related: ['task-lifecycle-and-risk', 'spawning-tasks', 'reading-the-work-graph'],
    },

    // ---------- Agents & MCP ----------
    {
      id: 'agents-and-mcp',
      title: 'Agents & MCP: what works today',
      category: 'agents',
      tags: ['agents', 'mcp', 'bearer', 'token', 'readiness-lifter', 'demo'],
      body: `Since Phase 3.1, Atlas hosts a \`workspace://\` **MCP server** at \`/mcp\`. Agents are real actors — with attribution — even though the Agent run panel isn't built yet.

## What an agent can do

- **Read**: \`workspace://specs\`, individual specs, their readiness, and tasks — as MCP resources
- **Write**: the \`spec.propose_edit\`, \`task.create\`, and \`task.update\` tools — the *same* domain services and policy checks the web UI goes through (gated specs and illegal transitions are rejected identically)

Agents authenticate with **bearer tokens** (\`atk_*\`); in dev, the seeder issues deterministic per-agent tokens. Every mutation is attributed to the agent's identity in the event log.

## See it live

Run \`make demo-agent\`: it creates a gated draft spec, and the **readiness-lifter** demo agent connects over MCP and lifts it past the threshold — while the Spec Editor's readiness panel climbs in real time over SSE. With \`ANTHROPIC_API_KEY\` set the sections are drafted by Claude; without it, a deterministic mock drafter runs the same code path.

## Not yet

Agent sessions, elicitations, verification evidence, and the Agent run panel land in later Phase 3/4 slices. OAuth replaces dev tokens in a later slice too.`,
      related: ['spec-editor-basics', 'the-eleven-primitives', 'task-lifecycle-and-risk'],
    },
  ],
};
