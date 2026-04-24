# Welcome to Atlas

Atlas is a **spec-native** project tracker. The unit of work is a _spec_, not a
ticket. A spec is a structured document — intent, non-goals, constraints,
acceptance criteria, open questions — that you _and_ eventually agents
collaborate on until it's ready to ship.

If you've only ever used Linear or Jira, the mental shift is:

- A **spec** is the thing you plan, review, and merge against. It has
  version history like code.
- A **task** is a delegable slice of a spec. It can be assigned to a human
  _or_ (from Phase 3) delegated to an agent.
- Done is defined by **executable acceptance criteria** — runnable tests
  with a status chip, not a human clicking "close".
- The default view is a **work graph**, not a kanban board. A graph is the
  honest shape of work when humans and agents are running in parallel.

## What phase is this?

Atlas ships in phases. You're looking at **Phase 2**:

- ✅ Phase 0 — foundations
- ✅ Phase 1 — spec viewer + editor + readiness
- ✅ **Phase 2 — tasks + interactive work graph (current)**
- ⏳ Phase 3 — MCP + agent SDK + first real agent
- ⏳ Phase 4 — sessions + evidence + morning digest
- ⏳ Phase 5 — Shape Up pitches + Living Artifact
- ⏳ Phase 6 — governance + metrics

The "Agent run" and "Digest" tabs are visible but not wired up yet — they
land in Phase 3 and 4.

## Starting from scratch (vs. the demo)

Atlas boots with the **Meridian Payments** demo workspace so every surface
has something to show. To see what a truly empty Atlas looks like:

1. Click **reset workspace** in the footer. That wipes specs, tasks, and
   the event log — but keeps the workspace, users, projects, and agents.
2. The Work Graph will show the empty state with a **+ Create your first
   spec** button.
3. Click it (or **+ New spec** in the top nav) and fill in title /
   project / owner. You're off.

To get the demo data back, run `make seed` from a terminal.

## Next

1. **Reading the Work Graph** — decode what's actually on your screen right now.
2. **The 11 primitives in 2 minutes** — the full vocabulary.
3. **Your first spec** — create one from zero.
