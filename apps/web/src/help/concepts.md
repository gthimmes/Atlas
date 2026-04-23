# The 11 primitives in 2 minutes

Every object in Atlas is one of these eleven types. Memorize these and the
whole product makes sense.

1. **Spec** — the unit of work. Structured doc with intent, non-goals,
   constraints, acceptance, open questions. Has a version number.
2. **Acceptance Criterion** — a testable claim inside a spec. Each has a
   status chip: _unverified · generated · passing · failing · flaky_.
3. **Task** — an actionable slice of a spec. Assigned to a human,
   optionally delegated to an agent. Has a risk level (green/amber/red).
4. **Agent Session** _(Phase 3)_ — one agent, one task, one run.
   Produces activities, elicitations, and (at close) evidence.
5. **Verification Evidence** _(Phase 3/4)_ — what an agent submits when it
   thinks a task is done: tests added, benchmarks, recordings, diff
   clusters, self-assessment per criterion.
6. **Context Bundle** _(Phase 3+)_ — the files/ADRs/skills/MCP endpoints
   scoped to a task. Agents read the resolved bundle at task start.
7. **Pitch** _(Phase 5)_ — Shape Up-style pre-spec problem frame. Has an
   _appetite_ (fixed time, variable scope) and hill tracks.
8. **Decision (ADR)** _(Phase 5/6)_ — a choice worth remembering. Agents
   can be required to emit one for non-trivial design choices.
9. **Work Graph** — the projection of all of the above as a DAG. This is
   the default view you're looking at.
10. **Constitution** _(Phase 6)_ — workspace-scoped policies enforced when
    evidence is submitted. Blocking violations reject the submission.
11. **Living Artifact** _(Phase 5)_ — a shipped spec's post-ship
    projection: branches, PRs, deploys, incidents.

Most of what you'll do in Phases 1–2 stays in the first three primitives:
**spec → acceptance criterion → task**.
