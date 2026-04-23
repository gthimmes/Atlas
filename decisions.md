# Atlas — Decisions Log

**Purpose:** resolve every open question in the Atlas spec §13, plus the
additional gaps surfaced during design review, into concrete rulings an
implementation agent can execute without further judgment calls.

**How to read this file:** each entry has a **Question**, a **Decision**,
and **Rationale**. Decisions are binding unless explicitly reopened.
Anything not captured here defers to `schema.ts` for shape and
`atlas-spec.md` for product intent.

---

## 1. Spec Readiness Score — formula

**Question:** Exact weights, component rubrics, threshold, and update
cadence for the readiness score.

**Decision:**

Weights sum to 100, configurable per workspace but seeded with these
defaults (see `ReadinessWeights` in schema):

| Component             | Weight | Full credit when…                                                                |
| --------------------- | -----: | -------------------------------------------------------------------------------- |
| Acceptance structure  |     40 | ≥3 criteria; each has a `test_type`; ≥1 is `property` or `integration`           |
| Non-goals present     |     20 | ≥2 non-goals, each ≥5 words                                                      |
| Constraints specific  |     20 | ≥1 constraint with a numeric `budget` (metric + op + value)                      |
| Open questions closed |     10 | Every question with `blocks_spawn: true` is resolved                             |
| Context bundle        |     10 | Bundle attached, resolved_tokens_estimate ≤ workspace ceiling, 0 exclusions-only |

**Partial credit** within each component is linear between a defined
"zero bar" and "full credit" state. Examples:

- _Acceptance structure:_ 0 at zero criteria; 0.33 at 1 criterion; 0.66 at
  2; 1.0 at ≥3 meeting the rubric. If ≥3 exist but none are property/
  integration, cap at 0.8.
- _Non-goals:_ 0.5 per qualifying entry up to 1.0.
- _Constraints specific:_ 0.5 if ≥1 constraint exists without a budget;
  1.0 if ≥1 has a budget.
- _Open questions:_ 1.0 if no blocking question exists; otherwise
  `resolved / total_blocking`, rounded down to nearest 0.1.
- _Context bundle:_ 0 if no bundle; 0.5 if bundle present; +0.3 if under
  token ceiling; +0.2 if ≥1 inclusion rule (not purely inherited).

**Threshold:** 70. Below 70 ⇒ `gated: true`, "Spawn" disabled.
Workspace admins can adjust 50–90 in 5-point steps.

**Update cadence:** recomputed on every spec mutation event, with a 500 ms
debounce on the edit path. Surfaced via Server-Sent Events on
`workspace://specs/{id}/readiness`.

**Rationale:** The score has to be both obvious (users can game it on
purpose during drafts) and defensible (the cap-at-0.8 rule punishes the
"five vague criteria" anti-pattern). Weights skew toward acceptance
because that is the artifact agents actually execute against.

---

## 2. MCP `workspace://` endpoint — shape and auth

**Question:** Resource shape, verbs, auth model for the workspace MCP
endpoint. Non-negotiable day-one per §1.

**Decision:**

- **Transport:** MCP over HTTP+SSE (standard). Streaming for subscribe
  operations; request/response for CRUD.
- **Auth:** OAuth 2.1 with PKCE. Agent identities get workspace-scoped
  tokens with per-project scopes; human users authenticate via SSO and
  can issue delegated tokens to specific agent sessions.
- **Resource URIs:** all resources are URI-addressable, e.g.
  `workspace://specs/{spec_id}`, `workspace://tasks/{task_id}/activity`,
  `workspace://bundles/{bundle_id}/resolved`.
- **Verbs:** `resources/list`, `resources/read`, `resources/subscribe`
  (standard MCP), plus domain-specific tools `spec.propose_edit`,
  `task.claim`, `task.submit_evidence`, `elicit.ask`, `adr.emit`,
  `bundle.resolve`. No direct `write` — all mutations go through tools
  that enforce policy.
- **Capabilities surface:** server advertises capabilities at handshake;
  tool availability depends on agent trust tier and task scope.
- **Rate limits:** per-token bucket, ACU cost attached to each tool call
  and billed to the session's budget.

**Rationale:** We want third-party agents (not just Claude) to speak this
protocol. MCP is already table stakes. Forcing all mutation through
tools (not resource `write`) lets us keep policy enforcement in one
place.

---

## 3. Verification Evidence — JSON schema

**Question:** What counts as "sufficient" evidence; required vs optional
fields; how the digest summarizes it.

**Decision:**

- Required fields: `tests_added OR tests_modified` (at least one),
  `self_assessment` covering every acceptance criterion on the parent
  spec, `diff_clusters` (even if one).
- Required only for specific task kinds:
  - UI work ⇒ ≥1 `recordings` entry with `kind: "image" | "video"`.
  - Performance constraints ⇒ `benchmarks` entry per affected metric.
- Optional: `deviations`. Any entry with `escalate: true` forces human
  review regardless of trust tier.
- Failing `self_assessment` on any criterion ⇒ session cannot close as
  `complete`; must transition to `awaiting_input` for human.
- Digest summarization (§5.4):
  - `summary_title`: agent-authored, ≤80 chars.
  - `summary_bullets`: exactly 3–5 bullets, ≤140 chars each, clustered
    by `diff_clusters.intent`.
  - `acceptance_pass_rate`: derived from `self_assessment`.
  - `deviations_count`: surfaced as a warning chip if >0.
- Schema version: every evidence blob carries `schema_version: 1`;
  migrations are additive-only.

**Rationale:** "Pass/fail + diff + 3 bullets" is the minimum signal a
reviewer needs to trust an auto-merge or scan it in 20 seconds. Everything
beyond that is situational.

---

## 4. Agent SDK surface — `@atlas/agent-sdk`

**Question:** What methods does the SDK expose; streaming shapes;
error model.

**Decision:**

```ts
// Imperative, not a class tree. One session at a time per process.
import { connectSession } from "@atlas/agent-sdk";

const session = await connectSession({ token, taskId });

// Read-only
const spec = await session.spec();               // parent spec
const bundle = await session.bundle();           // resolved context bundle
for await (const file of session.files()) { ... } // streams bundle files

// Mutations (all go through MCP tools; all enforce policy)
await session.recordDecision({ title, context, options, decision, consequences });
await session.submitEvidence(evidence);
await session.claimSubtask(taskId);

// Human-in-the-loop
const answer = await session.elicit({ question, options, writesBackToSpec });
// Returns { id, answer, answeredBy, answeredAt }

// Sub-agent spawn (subject to trust + budget)
const child = await session.spawnSubagent({ taskId, budget });

// Streaming
const stream = session.subscribe("acceptance_results"); // SSE-backed
for await (const evt of stream) { ... }

// Budget / signals
session.onBudgetWarning(cb);          // fired at 80% ACU or 80% tokens
session.onStopRequested(cb);          // human can halt; SDK forwards SIGTERM
```

- **Error model:** all calls throw `AtlasSdkError` with `code`
  (`E_POLICY_DENIED`, `E_BUDGET_EXCEEDED`, `E_CONTEXT_STALE`,
  `E_ELICIT_TIMEOUT`, `E_SCHEMA_MISMATCH`), `retryable: boolean`,
  `message`.
- `session.elicit()` is a long-poll; default timeout is workspace-config
  (24h default). Timeout returns `E_ELICIT_TIMEOUT`; agent must decide
  to escalate or defer.
- Heartbeat: SDK automatically heartbeats every 30s while session is
  `active`; if missed 3× the session flips to `stale` and all further
  tool calls fail with `E_SESSION_STALE`.

**Rationale:** Keep the SDK procedural. Classes/fluent builders obscure
the trust boundary — every method call can be denied by the server, so
callers must be error-aware at each step.

---

## 5. Trust tiers + risk classifier — contract

**Question:** What's the exact state machine for trust tiers; what inputs
does the risk classifier take; what's the output surface.

**Decision:**

**Trust tiers** (per agent identity, per project):

- **L0 — Propose.** Agent can open PRs; every merge requires a human on
  the pattern owner.
- **L1 — Auto-merge allowlist.** Agent can merge PRs whose _only_ touched
  paths match `TrustPolicy.allowlist` AND risk classifier returns
  `green` AND all acceptance criteria pass AND no `deviations` escalate.
- **L2 — Extended auto-merge.** Same as L1 but allowlist can include
  production paths. `l2_sample_rate` (default 10%) of merges are flagged
  `sampled_for_review: true` and surfaced in the digest even though they
  auto-merged.
- **Blocklist always wins.** Any touched path matching
  `TrustPolicy.blocklist` forces human review regardless of tier.

**Promotion rule:** admin-only. Pre-condition:
`first_pass_rate ≥ 0.85 over last 20 sessions in this project`. Enforced
in UI; admin can override with justification logged as an ADR.

**Risk classifier** (see `RiskClassification` in schema):

- **Input:** `{ task, paths, lines_changed, dependency_diff, schema_diff, spec_text }`
- **Output:** `level: "green" | "amber" | "red"` + ranked `signals[]`.
- **Signal scoring (v1, simple rules; v2 will be learned):**

| Signal              | Red if…                                             | Amber if…                      | Weight |
| ------------------- | --------------------------------------------------- | ------------------------------ | -----: |
| path_sensitive      | touches `auth/`, `payments/`, `migrations/`, `pii/` | touches `api/` public surfaces |    1.0 |
| lines_changed       | >500                                                | >150                           |    0.5 |
| new_dependency      | any new production dep                              | new dev-only dep               |    0.8 |
| schema_change       | any migration                                       | —                              |    1.0 |
| auth_keyword        | `password`, `token`, `secret` in diff               | —                              |    0.9 |
| payment_keyword     | `charge`, `refund`, `stripe` in diff                | —                              |    0.9 |
| pii_keyword         | `email`, `ssn`, `dob` in diff (non-test)            | in test files                  |    0.7 |
| stale_review_window | >24h since last human touch on path                 | —                              |    0.3 |
| ml_model            | model file changed                                  | prompt file changed            |    0.6 |

`level` is `red` if any red signal triggers; `amber` if any amber; else
`green`. Classifier output is attached to every digest item and shown as
the risk chip.

**Rationale:** The classifier must be _explainable_. Rules-based v1
means every amber/red chip can point to the signal that fired. Learned
v2 later, once we have ~1000 labeled outcomes.

---

## 6. Spec ↔ Git sync — direction and conflict resolution

**Question:** Does Atlas own specs, or does Git? Two-way sync?

**Decision:**

- **Atlas is authoritative.** Specs live in Atlas; optional one-way sync
  writes a canonical Markdown render to `repo_path` on every version
  bump. Agents read specs from `workspace://`, not from Git.
- **Why not two-way:** merge conflicts between human prose edits in the
  IDE and Atlas structured-editor writes are unrecoverable without a
  schema-aware merge tool we're not shipping yet.
- **Escape hatch:** workspace setting `spec_sync.enabled = false` turns
  off Git writes entirely. Teams that insist on Git-as-truth can adopt
  at a later date.
- **ADRs:** same model — Atlas-authoritative, optional write-out to
  `docs/decisions/`. ADRs in a PR body are ingested on merge.

**Rationale:** Spec-as-UI only works if the spec can be mutated safely
from the UI. Git-as-truth makes every spec edit a PR, which is exactly
the friction Atlas is supposed to remove.

---

## 7. Pitch appetite → ACU budget conversion

**Question:** How do we translate "6-week bet" into a hard ACU ceiling?

**Decision:**

`budget_acu = appetite.weeks × workspace.acu_per_week × 0.6`

The 0.6 factor reserves 40% of the workspace's weekly spend for
maintenance, ambient agents, and overhead. `acu_per_week` is set at
workspace creation based on plan; admins can raise it.

**When budget hits 80%:** session receives `onBudgetWarning`; pitch
surface shows an amber chip on the hill track.

**When budget hits 100%:** all new tool calls on sessions under this
pitch fail with `E_BUDGET_EXCEEDED`. Existing sessions continue until
natural stop. The pitch moves to `status: "in_flight"` with a
budget-exceeded warning; the accountable human decides whether to
allocate more ACU (logged as an ADR) or ship what's there.

**Rationale:** Hard ceilings are the point of Shape Up appetites. Soft
warnings at 80% give humans time to course-correct without the jarring
mid-task stop.

---

## 8. Notifications — realtime vs digest

**Question:** Which events are batched into the morning digest vs
delivered immediately?

**Decision:**

**Immediate (breaking the rhythm is warranted):**

- Elicitation raised with no other humans available.
- Session entered `error` state and the agent self-diagnosed as
  unrecoverable.
- Risk classifier returned `red` on a PR about to auto-merge (the merge
  is halted until acknowledged).
- Deploy rolled back.
- Constitution violation at blocking severity.

**Digest (delivered at the workspace's configured hour, default 09:00
local for each user):**

- Sessions complete.
- PRs merged (including auto-merges).
- Acceptance criteria status changes.
- New ADRs emitted.
- Pitch hill-track movement.

Workspace setting `notification_model` toggles "realtime" (everything
firehose) or "digest" (the above). Default is "digest". Per-user
override available.

**Rationale:** The morning digest is the load-bearing interaction. Every
immediate notification has to earn its interruption budget.

---

## 9. Multi-workspace / multi-project scoping

**Question:** What's scoped to workspace vs project vs spec?

**Decision:**

- **Workspace-scoped:** users, billing, notification model, constitution,
  spec/ADR sync config, ACU-per-week, trust policies (but trust tiers
  live per project).
- **Project-scoped:** repo refs, trust tiers per agent, allowlist/
  blocklist, ambient agents.
- **Spec-scoped:** context bundle, pitch linkage, acceptance, tasks.
- **Task-scoped:** context bundle _override_ (inherits from spec
  otherwise), agent budget override.

A workspace can have N projects; a project maps 1:1 to a repo (or a
collection of repos joined by a meta-repo). No cross-workspace
references; deliberate constraint to keep the graph tractable.

**Rationale:** Project-as-repo is the atomic unit of trust. Trust tiers
across repos are never the same and shouldn't be.

---

## 10. Constitution — authoring and review UX

**Question:** How is the constitution authored? Do agents propose
clauses? How often is it reviewed?

**Decision:**

- **Authoring:** workspace admins only. Editor is the Spec Editor with
  a different schema — clauses have `text`, `severity`, `scope`,
  `path_scope`, optional `test_ref`.
- **Agent proposals:** agents can emit an ADR with
  `trigger_pattern: "constitution_candidate"` when they detect a
  recurring policy gap; admin can promote to clause from the ADR view.
- **Review cadence:** workspace setting, default quarterly. A nag
  appears on the digest when `last_reviewed` is >90 days old.
- **Enforcement:** each clause with `severity: "blocking"` produces a
  policy check that runs at `submitEvidence` time. Failure ⇒ evidence
  rejected, session transitions to `awaiting_input`.
- **Amendments:** increment `version`; each clause tracks
  `amended_from`. Old versions retained for evidence-against-constitution-at-the-time audits.

**Rationale:** A constitution that nobody reads is worse than none.
The quarterly nag + agent-driven candidate surfacing keep it alive
without adding meetings.

---

## Deferred (explicitly out of scope for v1)

- **Learned risk classifier.** Need labeled data first; rules-based v1
  is shippable.
- **Two-way Git sync for specs.** Schema-aware merge tooling required.
- **Multi-workspace agent identities.** Agents are workspace-scoped in
  v1; cross-workspace identity is a v2 concern.
- **Marketplace for skills.** `@skill/...` refs resolve against a
  built-in registry in v1. Third-party publishing is v2.
- **Mobile app.** Digest email is the mobile story for v1.
