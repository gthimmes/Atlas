// Atlas — canonical data model. All 11 primitives as TypeScript types.
// This is the source of truth for the backend, the @atlas/agent-sdk,
// the workspace:// MCP endpoint, and the UI client.
//
// Conventions:
//  - All IDs are string-typed with a branded prefix (e.g. "spec_2f9a")
//  - Timestamps are ISO-8601 strings
//  - All mutations are append-only event-sourced; the fields below
//    describe the *materialized* view
//  - Nullable = explicit optionality; absence means "never set"
//  - Monetary amounts are in ACU (Atlas Credit Units); 1 ACU ≈ $0.01

// ─── ID brands ─────────────────────────────────────────────────────────────

export type WorkspaceId = `ws_${string}`;
export type ProjectId = `prj_${string}`;
export type UserId = `usr_${string}`;
export type AgentId = `agt_${string}`;
export type SpecId = `spec_${string}`;
export type TaskId = `task_${string}`;
export type SessionId = `sess_${string}`;
export type PitchId = `pitch_${string}`;
export type AcceptanceId = `ac_${string}`;
export type AdrId = `adr_${string}`;
export type BundleId = `bun_${string}`;
export type EvidenceId = `ev_${string}`;
export type ElicitId = `el_${string}`;
export type ActivityId = `act_${string}`;

export type Iso8601 = string;
export type GitSha = string; // 40-char hex
export type RepoRef = `${string}@${GitSha}` | `${string}@${string}`; // "owner/repo@<ref>"

// ─── Shared enums ──────────────────────────────────────────────────────────

export type SpecStatus = 'draft' | 'shaped' | 'ready' | 'in_flight' | 'shipped' | 'archived';
export type TaskStatus =
  | 'proposed'
  | 'ready'
  | 'in_flight'
  | 'blocked'
  | 'review'
  | 'done'
  | 'cancelled';
export type SessionStatus =
  | 'pending'
  | 'active'
  | 'awaiting_input'
  | 'error'
  | 'complete'
  | 'stale';
export type AcceptanceStatus = 'unverified' | 'generated' | 'passing' | 'failing' | 'flaky';
export type AcceptanceType = 'property' | 'integration' | 'bdd' | 'manual' | 'eval';
export type AdrStatus = 'proposed' | 'accepted' | 'rejected' | 'superseded';
export type PitchStatus = 'shaping' | 'table' | 'scheduled' | 'in_flight' | 'shipped' | 'killed';
export type RiskLevel = 'green' | 'amber' | 'red';
export type TrustTier = 'L0' | 'L1' | 'L2';
export type ActorKind = 'human' | 'agent' | 'system';
export type Severity = 'blocking' | 'advisory';

// ─── 4.1 Spec ──────────────────────────────────────────────────────────────

export interface Spec {
  id: SpecId;
  workspace: WorkspaceId;
  project: ProjectId;
  pitch: PitchId | null; // specs can exist outside a pitch
  parent_spec: SpecId | null; // for spec hierarchies
  title: string;
  slug: string; // kebab-case, unique per workspace

  status: SpecStatus;
  version: number; // monotonic; each edit bumps
  head_sha: GitSha; // content hash of current version

  // Typed sections — each may be missing in drafts
  intent: string | null; // markdown prose
  non_goals: string[];
  constraints: Constraint[];
  acceptance: AcceptanceCriterion[];
  decisions: AdrId[]; // references, not embedded
  open_questions: OpenQuestion[];
  context_bundle: BundleId | null;

  // Computed fields (denormalized from events)
  readiness_score: number; // 0..100
  readiness_breakdown: ReadinessBreakdown;
  task_ids: TaskId[];
  actor_summary: { humans: UserId[]; agents: AgentId[] };

  // Git sync (optional; null if Atlas-only)
  repo_path: string | null; // e.g. ".atlas/specs/S-142.md"

  owner: UserId; // single responsible human
  created_at: Iso8601;
  created_by: UserId;
  updated_at: Iso8601;
  shipped_at: Iso8601 | null;
}

export interface Constraint {
  id: string;
  text: string;
  category: 'performance' | 'compliance' | 'compatibility' | 'security' | 'budget' | 'other';
  budget?: { metric: string; op: '<' | '<=' | '>' | '>='; value: number; unit: string };
}

export interface OpenQuestion {
  id: string;
  text: string;
  state: 'open' | 'resolved';
  blocks_spawn: boolean; // contributes to readiness gate
  resolved_by?: UserId;
  resolved_at?: Iso8601;
  resolution?: string;
}

// ─── 4.2 Acceptance Criterion ──────────────────────────────────────────────

export interface AcceptanceCriterion {
  id: AcceptanceId;
  spec: SpecId;
  statement: string;
  test_type: AcceptanceType;
  test_ref: TestRef | null;
  status: AcceptanceStatus;
  flakiness_score: number; // 0..1, rolling over last N runs
  last_run_at: Iso8601 | null;
  run_history: RunResult[]; // capped at N=50
  owner: UserId;
  proposed_by: UserId | AgentId; // humans accept before status counts
  accepted: boolean;
  created_at: Iso8601;
}

export interface TestRef {
  repo: RepoRef;
  path: string; // e.g. "tests/acceptance/ac_2f9a.test.ts"
  symbol: string | null; // function/test name
  generated: boolean; // was this produced by an agent?
}

export interface RunResult {
  at: Iso8601;
  outcome: 'pass' | 'fail' | 'error' | 'skip';
  duration_ms: number;
  commit: GitSha;
  ci_run_url?: string;
}

// ─── 4.3 Task ──────────────────────────────────────────────────────────────

export interface Task {
  id: TaskId;
  workspace: WorkspaceId;
  parent_spec: SpecId;
  parent_task: TaskId | null;
  title: string;
  description: string | null;
  status: TaskStatus;

  assignee: UserId; // accountable human (required)
  delegated_to: SessionId | null; // active agent session
  delegation_history: SessionId[]; // prior sessions for this task

  blocks: TaskId[];
  blocked_by: TaskId[];

  context_bundle_override: BundleId | null;

  agent_budget: {
    acu_ceiling: number;
    wall_clock_ceiling_sec: number;
  } | null;

  risk: RiskLevel; // computed from classifier
  paths: string[]; // repo paths this task touches

  proposed_by: UserId | AgentId;
  approved_by: UserId | null; // required for agent-proposed tasks

  created_at: Iso8601;
  updated_at: Iso8601;
  completed_at: Iso8601 | null;
}

// ─── 4.4 Agent Session ─────────────────────────────────────────────────────

export interface AgentSession {
  id: SessionId;
  workspace: WorkspaceId;
  agent_identity: AgentId;
  accountable_human: UserId; // per Linear rule: humans own, delegate
  task: TaskId | null;
  parent_session: SessionId | null; // spawned sub-agent

  model: string; // e.g. "claude-opus-4-7"
  tools_available: string[]; // enumerated tool names
  skills: string[]; // skill refs e.g. "@skill/test-first"
  mcp_endpoints: string[]; // e.g. ["workspace://", "github://"]

  context_budget: {
    tokens_used: number;
    tokens_max: number;
    compactions: number;
  };
  cost_acu: number;
  started_at: Iso8601;
  last_heartbeat: Iso8601;
  completed_at: Iso8601 | null;

  sub_agents: SessionId[];
  activity_count: number; // total events; fetch page via API

  status: SessionStatus;
  error?: { code: string; message: string };

  emitted_decisions: AdrId[];
  verification_evidence: EvidenceId | null;
}

export interface Activity {
  id: ActivityId;
  session: SessionId;
  at: Iso8601;
  kind:
    | 'read'
    | 'edit'
    | 'tool_call'
    | 'reason'
    | 'decision'
    | 'elicit'
    | 'subagent_spawn'
    | 'compact'
    | 'error'
    | 'heartbeat';
  // Discriminated payload by kind; keep UI-relevant fields flat
  payload: {
    path?: string; // for read/edit
    diff_lines?: { added: number; removed: number };
    tool?: string; // for tool_call
    args_redacted?: Record<string, unknown>;
    summary?: string; // for reason/decision
    elicit_id?: ElicitId; // for elicit
    sub_session?: SessionId;
  };
}

export interface Elicitation {
  id: ElicitId;
  session: SessionId;
  task: TaskId | null;
  question: string;
  options: string[] | null; // multiple-choice if present
  raised_at: Iso8601;
  answered_at: Iso8601 | null;
  answered_by: UserId | null;
  answer: string | null;
  writes_back_to_spec: boolean; // if true, answer becomes spec clarification
}

// ─── 4.5 Verification Evidence ─────────────────────────────────────────────

export interface VerificationEvidence {
  id: EvidenceId;
  session: SessionId;
  task: TaskId;
  submitted_at: Iso8601;

  tests_added: TestRef[];
  tests_modified: TestRef[];
  benchmarks: Benchmark[];
  recordings: MediaArtifact[]; // for UI work

  // Intent-grouped diff (Devin Review pattern)
  diff_clusters: DiffCluster[];

  // Per-criterion agent self-assessment
  self_assessment: Array<{
    criterion: AcceptanceId;
    status: AcceptanceStatus;
    rationale: string;
    evidence_refs: string[];
  }>;

  deviations: Array<{
    from_spec_section: 'intent' | 'constraints' | 'acceptance' | 'decisions';
    description: string;
    justification: string;
    escalate: boolean; // forces human review even on L1/L2
  }>;
}

export interface Benchmark {
  metric: string;
  baseline: number;
  result: number;
  unit: string;
  delta_pct: number;
}

export interface MediaArtifact {
  kind: 'image' | 'video' | 'trace';
  url: string;
  caption: string;
  duration_sec?: number;
}

export interface DiffCluster {
  intent: string; // human-readable cluster heading
  files: Array<{ path: string; added: number; removed: number }>;
  commit_range: { from: GitSha; to: GitSha };
}

// ─── 4.6 Context Bundle ────────────────────────────────────────────────────

export interface ContextBundle {
  id: BundleId;
  scope: 'workspace' | 'project' | 'epic' | 'spec' | 'task';
  scope_ref: string; // ID of the scope entity
  version: number;
  parent_bundle: BundleId | null; // inheritance chain

  files: Array<{
    repo: RepoRef;
    path: string; // supports globs
    reason: string; // why this file is in context
  }>;
  adrs: AdrId[];
  constitution_scope: string[]; // clause IDs that apply
  skills: string[]; // "@skill/..."
  mcp_endpoints: string[];
  exclusions: string[]; // globs; applied after inheritance merge

  // Computed (resolved union-minus-exclusions)
  resolved_files: Array<{ repo: RepoRef; path: string; sha: GitSha }>;
  resolved_tokens_estimate: number;

  created_at: Iso8601;
  created_by: UserId | AgentId;
}

// ─── 4.7 Pitch ─────────────────────────────────────────────────────────────

export interface Pitch {
  id: PitchId;
  workspace: WorkspaceId;
  title: string;
  problem: string; // markdown
  appetite: Appetite;
  solution_sketch: SolutionSketch;
  rabbit_holes: string[];
  no_gos: string[];
  stakeholders: UserId[];
  status: PitchStatus;

  hill_tracks: Array<{
    id: string;
    label: string;
    position: number; // 0..1, 0.5 = crest
    last_moved_at: Iso8601;
  }>;

  agent_budget_acu: number; // derived from appetite
  scheduled_at: Iso8601 | null;
  cool_down_until: Iso8601 | null;
  generated_spec: SpecId | null; // produced at scheduling time

  created_at: Iso8601;
  created_by: UserId;
}

export interface Appetite {
  kind: 'small' | 'big' | 'custom';
  weeks: number;
  // Converts to ceiling at scheduling: weeks × workspace.acu_per_week
}

export interface SolutionSketch {
  kind: 'prose' | 'canvas' | 'both';
  prose: string | null; // markdown
  canvas: CanvasDoc | null; // fat-marker drawing
}

export interface CanvasDoc {
  strokes: Array<{
    points: number[]; // flat [x0,y0,x1,y1,...]
    color: string;
    width: number;
  }>;
  annotations: Array<{ x: number; y: number; text: string }>;
  width: number;
  height: number;
}

// ─── 4.8 Decision (ADR) ────────────────────────────────────────────────────

export interface Adr {
  id: AdrId;
  workspace: WorkspaceId;
  title: string;
  context: string; // markdown
  options_considered: Array<{
    name: string;
    pros: string[];
    cons: string[];
  }>;
  decision: string; // the chosen option + rationale
  consequences: string[];

  status: AdrStatus;
  supersedes: AdrId | null;
  superseded_by: AdrId | null;

  emitting_session: SessionId | null; // null if human-authored
  emitted_by: UserId | AgentId;
  human_reviewer: UserId | null;
  reviewed_at: Iso8601 | null;

  // Pattern that triggered auto-emit (null for human-authored)
  trigger_pattern: string | null; // e.g. "new_dependency"

  tags: string[]; // for search
  related_specs: SpecId[];
  repo_path: string | null; // if synced to docs/decisions/

  created_at: Iso8601;
}

// ─── 4.9 Work Graph ────────────────────────────────────────────────────────
// The graph is a computed projection; only edges are stored explicitly
// when they can't be derived from the primitive fields.

export interface GraphEdge {
  id: string;
  kind:
    | 'spawned_from'
    | 'blocks'
    | 'blocked_by'
    | 'delegated_to'
    | 'implements'
    | 'deploys'
    | 'supersedes';
  from: { type: 'spec' | 'task' | 'session' | 'pr' | 'deploy' | 'adr'; id: string };
  to: { type: 'spec' | 'task' | 'session' | 'pr' | 'deploy' | 'adr'; id: string };
  created_at: Iso8601;
}

// ─── 4.10 Constitution ─────────────────────────────────────────────────────

export interface Constitution {
  workspace: WorkspaceId;
  version: number;
  last_reviewed: Iso8601;
  clauses: ConstitutionClause[];
}

export interface ConstitutionClause {
  id: string; // stable, semver-friendly, e.g. "c1"
  text: string;
  severity: Severity;
  scope: 'workspace' | { project: ProjectId[] };
  test_ref: TestRef | null; // optional runnable check
  path_scope: string[] | null; // if set, clause only applies to these paths
  created_at: Iso8601;
  amended_from: { version: number; clauseId: string } | null;
}

// ─── 4.11 Living Artifact ──────────────────────────────────────────────────
// Purely computed view; not stored. Shape included for API contract.

export interface LivingArtifactView {
  spec: SpecId;
  branches: Array<{ name: string; head: GitSha; stale: boolean }>;
  pull_requests: Array<{
    number: number;
    repo: RepoRef;
    title: string;
    state: 'open' | 'merged' | 'closed';
    author: UserId | AgentId;
    ci_status: 'pending' | 'passing' | 'failing' | 'none';
    diff_summary: DiffCluster[]; // synthetic, grouped by intent
    preview_env_url: string | null;
  }>;
  deploys: Array<{
    ring: 'canary' | 'staging' | 'prod';
    at: Iso8601;
    commit: GitSha;
    status: 'pending' | 'succeeded' | 'rolled_back';
  }>;
  incidents: Array<{ id: string; url: string; status: 'open' | 'resolved' }>;
  computed_at: Iso8601;
}

// ─── Governance: Trust tiers + risk classifier ─────────────────────────────

export interface TrustPolicy {
  workspace: WorkspaceId;
  project: ProjectId;
  tiers: Record<AgentId, TrustTier>; // per-agent-identity, per-project
  allowlist: string[]; // path globs for L1 auto-merge
  blocklist: string[]; // path globs that ALWAYS require review
  l2_sample_rate: number; // 0..1; default 0.1
}

export interface RiskClassification {
  task: TaskId;
  session: SessionId;
  level: RiskLevel;
  signals: Array<{
    kind:
      | 'path_sensitive'
      | 'lines_changed'
      | 'new_dependency'
      | 'schema_change'
      | 'auth_keyword'
      | 'payment_keyword'
      | 'pii_keyword'
      | 'stale_review_window'
      | 'ml_model';
    value: string | number;
    weight: number;
  }>;
  classified_at: Iso8601;
  model_version: string;
}

// ─── Workspace / users / agents ────────────────────────────────────────────

export interface Workspace {
  id: WorkspaceId;
  name: string;
  slug: string;
  plan: 'free' | 'team' | 'business';
  acu_per_week: number; // used for appetite→budget conversion
  default_cool_down_weeks: number; // default 2
  default_bet_weeks: number; // default 6
  notification_model: 'digest' | 'realtime';
  spec_sync: { enabled: boolean; repo: RepoRef | null; path_prefix: string };
  adr_sync: { enabled: boolean; repo: RepoRef | null; path_prefix: string };
  created_at: Iso8601;
}

export interface User {
  id: UserId;
  workspace: WorkspaceId;
  email: string;
  name: string;
  role: 'admin' | 'member' | 'viewer';
  created_at: Iso8601;
}

export interface AgentIdentity {
  id: AgentId;
  workspace: WorkspaceId;
  handle: string; // e.g. "claude-backend"
  model: string;
  oauth_issuer: string;
  owner: UserId; // admin who registered it
  description: string | null;
  approved: boolean; // self-service requires admin approval for L1+
  trust_history: Array<{ project: ProjectId; tier: TrustTier; promoted_at: Iso8601 }>;
  stats: {
    sessions_total: number;
    first_pass_rate: number; // 0..1
    avg_cost_acu: number;
    last_active: Iso8601;
  };
}

// ─── Readiness score: weights are workspace-configurable ───────────────────

export interface ReadinessWeights {
  acceptance_structure: number; // default 40
  non_goals_present: number; // default 20
  constraints_specific: number; // default 20
  open_questions: number; // default 10
  context_bundle: number; // default 10
}

export interface ReadinessBreakdown {
  weights: ReadinessWeights;
  components: {
    acceptance_structure: { score: number; max: number; notes: string[] };
    non_goals_present: { score: number; max: number; notes: string[] };
    constraints_specific: { score: number; max: number; notes: string[] };
    open_questions: { score: number; max: number; notes: string[] };
    context_bundle: { score: number; max: number; notes: string[] };
  };
  threshold: number; // workspace-configured, default 70
  gated: boolean; // true ⇒ spawn disabled
  computed_at: Iso8601;
}

// ─── Digest (materialized morning view) ────────────────────────────────────

export interface DigestItem {
  id: string;
  workspace: WorkspaceId;
  session: SessionId;
  task: TaskId;
  submitted_at: Iso8601;
  merged_at: Iso8601 | null; // null if still pending review
  auto_merged: boolean;
  sampled_for_review: boolean; // L2 sampling

  risk: RiskClassification;
  trust: TrustTier;
  summary_title: string;
  summary_bullets: string[];
  diff_clusters: DiffCluster[];
  acceptance_pass_rate: { passed: number; total: number };
  deviations_count: number;

  human_action: 'pending' | 'approved' | 'changes_requested' | 'escalated';
  actioned_by: UserId | null;
  actioned_at: Iso8601 | null;
}

// ─── Metrics (§9) ──────────────────────────────────────────────────────────

export interface WorkspaceMetrics {
  workspace: WorkspaceId;
  period: { from: Iso8601; to: Iso8601 };
  outcome_velocity: { pitches_shipped: number; appetite_accuracy: number };
  spec_clarity_index: number; // 0..1
  rework_rate: { lines: number; pct_of_merged: number };
  time_to_merged_pr_p50_hours: number;
  agent_first_pass_rate: number; // 0..1
  human_review_time_pct: number; // 0..1; minimize target
  digest_latency_p50_hours: number;
  hill_drift_count: number; // pitches stuck > appetite/3
}
