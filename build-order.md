# Atlas — Build Order

A milestone plan. Build in this order. Don't freestyle.

## M0 — Walking Skeleton (week 1)

Ship the thinnest end-to-end path that exercises every layer:

- Workspace + user + one project (seeded from `fixtures/`).
- `schema.ts` compiled and exported from `@atlas/schema`.
- HTTP API for `GET /workspaces/:id/specs/:id` — reads a seeded spec.
- Static UI shell with left-nav + Work Graph surface wired to read one
  spec via the API. No editing, no live updates, no agents.
- Deploy behind auth (single admin token is fine for M0).

**Exit criterion:** a human can open the app, see the seeded graph, and
click a node to open a read-only spec view. This proves the whole
stack is plumbed.

## M1 — Spec Editor + Readiness (week 2)

- `POST /specs/:id` structured-edit mutations.
- Readiness score computed server-side, streamed over SSE.
- Spec Editor surface (match `prototype/Atlas.html`) fully editable.
- Acceptance-criterion chips with the "generate test preview"
  elicitation stub (just returns a canned response).

**Exit:** a human can draft a spec, watch readiness rise, and hit
threshold 70.

## M2 — MCP Endpoint + Agent SDK (week 3)

- MCP server implementing `workspace://specs`, `workspace://tasks`,
  and the mutation tools listed in `api-contract.md`.
- `@atlas/agent-sdk` published (npm + pypi) wrapping MCP.
- Claude API integration: a single "draft missing sections" agent that
  reads a below-threshold spec and proposes edits.

**Exit:** an agent, running against a real LLM, can lift a spec's
readiness score autonomously.

## M3 — Task + Session + Evidence (week 4)

- Task model wired; spec can spawn tasks when not gated.
- Agent Session lifecycle with heartbeat, budget, status.
- Verification Evidence schema enforced at session close.
- Agent Run Panel surface live (match prototype), reading SSE.

**Exit:** an agent session completes a task end-to-end and submits
evidence; a human sees it in the Run Panel.

## M4 — Work Graph + Digest (week 5)

- Work Graph surface fully live — nodes, edges, time scrubber.
- Risk classifier (rules v1) attached to every session.
- Morning Digest surface assembled; email + in-app delivery.
- Trust tiers + allowlist auto-merge gated on green classification.

**Exit:** an overnight batch of agent work lands in the morning digest
and a human clears it in under 2 minutes.

## M5 — Pitch Shaping + Living Artifact (week 6)

- Pitch surface (match `Atlas Handoff.html` low-fi).
- Hill tracks with check-in mutation.
- Living Artifact view — read-only projection of branches/PRs/deploys.
- Spec sync: one-way Markdown write-out to Git.

**Exit:** a pitch can be shaped, scheduled (budget computed from
appetite), shipped, and re-viewed as a Living Artifact.

## M6 — P1 Surfaces + Constitution (week 7–8)

- Decision Log index + ADR detail.
- Context Bundle Manager with inheritance preview.
- Constitution Editor + enforcement at evidence submission.
- Metrics dashboard.

**Exit:** all P0/P1 surfaces are live.

## Cross-cutting (all milestones)

- **Auth from M0.** Don't retrofit OAuth; ship it in M0 as admin-token
  - skeleton of PKCE flow, upgrade to full in M2.
- **Fixtures stay green.** The seed dataset in `fixtures/` is a
  smoke-test input; every milestone must render it cleanly.
- **Theme + density parity.** Dark and light themes, Linear-dense,
  from M0. Don't promise to retrofit.

## Explicit non-goals for v1

(See `decisions.md` § "Deferred".)

- Learned risk classifier.
- Two-way Git spec sync.
- Cross-workspace agent identities.
- Skill marketplace.
- Mobile app.
- Linear/Jira bridges (v1.1).
