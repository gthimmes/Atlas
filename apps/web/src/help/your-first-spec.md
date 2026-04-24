# Your first spec

Start from a truly empty workspace:

1. Click the footer's **reset workspace** link (dev-only). It wipes specs,
   tasks, and the event log, but keeps the workspace, users, projects,
   and agents. You'll see the Work Graph empty state.
2. Click **+ Create your first spec** on the empty state, or **+ New spec**
   in the top nav.

The modal asks for four things:

- **Title** — a human-readable sentence. This is what shows on the spec
  node in the Work Graph.
- **Project** — a spec belongs to one project. Atlas seeds a project
  called `Core` (`prj_core`). Pick it or create another via
  `POST /v1/tools/project.create`.
- **Owner** — the accountable human. Agents (Phase 3+) work on behalf of
  owners, never in place of them.
- **Intent** _(optional)_ — the outcome you expect. You can always add
  it later in the editor.

Submit. The server:

1. Appends a `spec.created` event to `event_log`.
2. Projects a fresh row in the `spec` read model with status `draft`,
   version `1`, and readiness recomputed.
3. Redirects you to the Spec Editor for the new id.

## Starting readiness: 10

An empty draft scores **10 / 100**, because the _"no blocking open
questions"_ component gives full 10 / 10 by default. Every other
component starts at zero. The gate is still on (10 < 70).

## Move the score up

The fastest way to cross 70:

- Add **3 acceptance criteria**, at least one with `test_type`
  `property` or `integration`. That's **+ 40** → 50.
- Add **2 non-goals**, each ≥ 5 words. That's **+ 20** → 70.
- Add **1 constraint with a numeric budget** (e.g. "p95 < 120ms"). That's
  **+ 20** → 90.

Phase 2 surfaces intent editing only; the other sections are still API-
driven. Editing them in-UI lands with Phase 3 when agents get the same
affordances as humans.

## Spawn tasks

Once gated is false, the **+ Spawn task** button in the editor header
becomes active. See _Spawning tasks_ for the form + state machine.

## Next

- _The readiness gate_ — full formula.
- _Acceptance criteria_ — status chips, test types, why it's weighted 40.
- _Spawning tasks_ — risk, state machine, blocks/blocked-by.
