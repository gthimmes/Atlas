# Atlas — Product Specification

**One line:** A spec-native workspace where humans and agents collaborate
on software projects as equal first-class actors, mediated by living
specs instead of tickets.

## §1 Thesis

Current tools (Linear, Jira, GitHub) treat agents as glorified shell
scripts: they open PRs, they close tickets, but the system still pivots
on human-authored tickets and human-made merges. Atlas inverts that.
The spec — not the ticket — is the unit of work. Humans and agents both
read, mutate, and ship against specs. The work graph is the product.

**Non-negotiables day one:** MCP `workspace://` endpoint, a readable
visual work graph, and a digest that compresses a night of agent work
into 20 seconds of human decision-making.

## §2 Audience

Engineering teams of 5–50 already using Claude / Devin / agents
seriously, already frustrated that those agents don't plug into Linear
in a load-bearing way. Initial ICP: fintech, infra, and devtools teams
with high-rigor change-management requirements.

## §3 Loops

1. **Shape → Ship.** Pitches are shaped (Shape Up style) into specs;
   specs spawn tasks; tasks spawn sessions; sessions produce evidence;
   evidence flows to the digest; humans approve or correct.
2. **Draft → Spec → Spawn.** Any spec below readiness threshold can't
   spawn agents. Humans and agents co-author specs until gated = false.
3. **Hill Chart → Cool-down.** Pitches move on hill tracks; shipped
   pitches enter a cool-down before the team picks up the next bet.

## §4 The 11 Primitives

All 11 are typed in `schema.ts`:

1. **Spec** — unit of work; structured doc with acceptance criteria.
2. **Acceptance Criterion** — testable claim with a `test_ref`.
3. **Task** — an actionable slice of a spec; delegable to agents.
4. **Agent Session** — a specific agent-run on a specific task.
5. **Verification Evidence** — what a session produces at close.
6. **Context Bundle** — the files/ADRs/skills scoped to a task.
7. **Pitch** — pre-spec problem frame with appetite.
8. **Decision (ADR)** — a choice worth remembering.
9. **Work Graph** — the projection of all of the above as a DAG.
10. **Constitution** — workspace-scoped policies enforced at close.
11. **Living Artifact** — the spec's post-shipped projection
    (branches, PRs, deploys, incidents).

## §5 Surfaces (P0/P1)

- **5.1 Work Graph** (P0, hero) — draggable nodes, time scrubber, risk
  chips. The headline view.
- **5.2 Spec Editor** (P0) — sectioned structured editor, live
  readiness score, acceptance chips with generated test preview.
- **5.3 Agent Run Panel** (P0) — live session activity, elicitations,
  tool calls, cost/budget.
- **5.4 Morning Digest** (P0) — overnight session summaries, 20-second
  approve/request-changes flow.
- **5.5 Pitch Shaping** (P0) — Shape-Up shaping surface with fat-marker
  canvas and hill tracks.
- **5.6 Living Artifact** (P1) — post-ship projection of a spec.
- **5.7 Decision Log** (P1) — ADR index with search + filters.
- **5.8 Context Bundle Manager** (P1) — inheritance-aware bundle editor.
- **5.9 Constitution Editor** (P1) — admin-scoped clause authoring.
- **5.10 Metrics** (P1) — workspace-level dashboards.

## §6 Data Model

See `schema.ts`. Every primitive is event-sourced; the types describe
the materialized view. All IDs are branded; timestamps are ISO-8601;
money is in ACU (Atlas Credit Units, 1 ACU ≈ $0.01).

## §7 Protocols

- **MCP over HTTP+SSE** for the `workspace://` endpoint.
- **OAuth 2.1 with PKCE** for auth. Agents get workspace-scoped
  tokens; humans authenticate via SSO.
- **`@atlas/agent-sdk`** thin procedural SDK wrapping MCP for agent
  authors.

Details in `api-contract.md` and `decisions.md` §2, §4.

## §8 Governance

- Trust tiers L0/L1/L2, per-agent-per-project.
- Risk classifier (rules-based v1, learned v2) attached to every digest
  item.
- Constitution clauses enforced at evidence-submission.

Details in `decisions.md` §5, §10.

## §9 Metrics

Outcome velocity, spec-clarity index, rework rate, time-to-merged-PR,
agent first-pass-rate, human-review-time %, digest latency, hill drift
count. See `WorkspaceMetrics` in `schema.ts`.

## §10 Lifecycle

Draft → Shaped → Ready → In-flight → Shipped → Archived, with a
cool-down after Shipped. Workspaces can configure default cool-down
and bet lengths.

## §11 Interop

- **GitHub/GitLab** for PR ingest and optional spec/ADR write-out.
- **Linear/Jira** read-only bridges (v1.1 — not v1).
- **Slack/email** for digest delivery.

## §12 Principles

1. **The spec is the UI.** If it's not in the spec, it doesn't happen.
2. **Humans own, agents do.** Accountability never leaves a human.
3. **Evidence beats assertion.** No merge without tests + self-
   assessment + diff.
4. **The morning digest is sacred.** Interrupt it only for red.
5. **Rules-based before learned.** Explainability first; ML later.

## §13 Open Questions (v1)

All resolved in `decisions.md`:

1. Spec readiness score formula → §1
2. MCP endpoint shape and auth → §2
3. Verification evidence schema → §3
4. Agent SDK surface → §4
5. Trust tiers + risk classifier contract → §5
6. Spec ↔ Git sync direction → §6
7. Pitch appetite → ACU budget conversion → §7
8. Notification model (realtime vs digest) → §8
9. Workspace / project scoping → §9
10. Constitution authoring UX → §10
