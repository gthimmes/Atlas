import { z } from 'zod';

// ─── Branded ID helpers ────────────────────────────────────────────────────
// Each ID is a string with a fixed prefix. We keep the runtime validator
// strict (prefix must match) so a WorkspaceId can never accidentally pass as
// a SpecId at a type boundary.

const idOf = <P extends string>(prefix: P) =>
  z.custom<`${P}_${string}`>(
    (v) => typeof v === 'string' && v.startsWith(`${prefix}_`) && v.length > prefix.length + 1,
    { message: `expected id with prefix "${prefix}_"` },
  );

export const WorkspaceId = idOf('ws');
export const ProjectId = idOf('prj');
export const UserId = idOf('usr');
export const AgentId = idOf('agt');
export const SpecId = idOf('spec');
export const TaskId = idOf('task');
export const SessionId = idOf('sess');
export const PitchId = idOf('pitch');
export const AcceptanceId = idOf('ac');
export const AdrId = idOf('adr');
export const BundleId = idOf('bun');
export const EvidenceId = idOf('ev');
export const ElicitId = idOf('el');
export const ActivityId = idOf('act');

export const Iso8601 = z.string().datetime({ offset: true });
export const GitSha = z.string().regex(/^[0-9a-f]{7,40}$/);
export const RepoRef = z.string().regex(/^[^@]+@[^@]+$/);

// ─── Shared enums ──────────────────────────────────────────────────────────

export const SpecStatus = z.enum(['draft', 'shaped', 'ready', 'in_flight', 'shipped', 'archived']);
export const TaskStatus = z.enum([
  'proposed',
  'ready',
  'in_flight',
  'blocked',
  'review',
  'done',
  'cancelled',
]);
export const SessionStatus = z.enum([
  'pending',
  'active',
  'awaiting_input',
  'error',
  'complete',
  'stale',
]);
export const AcceptanceStatus = z.enum(['unverified', 'generated', 'passing', 'failing', 'flaky']);
export const AcceptanceType = z.enum(['property', 'integration', 'bdd', 'manual', 'eval']);
export const AdrStatus = z.enum(['proposed', 'accepted', 'rejected', 'superseded']);
export const PitchStatus = z.enum([
  'shaping',
  'table',
  'scheduled',
  'in_flight',
  'shipped',
  'killed',
]);
export const RiskLevel = z.enum(['green', 'amber', 'red']);
export const TrustTier = z.enum(['L0', 'L1', 'L2']);
export const ActorKind = z.enum(['human', 'agent', 'system']);
export const Severity = z.enum(['blocking', 'advisory']);

// ─── Acceptance criterion + test refs ──────────────────────────────────────

export const TestRef = z.object({
  repo: RepoRef,
  path: z.string(),
  symbol: z.string().nullable(),
  generated: z.boolean(),
});

export const RunResult = z.object({
  at: Iso8601,
  outcome: z.enum(['pass', 'fail', 'error', 'skip']),
  duration_ms: z.number().int().nonnegative(),
  commit: GitSha,
  ci_run_url: z.string().url().optional(),
});

export const AcceptanceCriterion = z.object({
  id: AcceptanceId,
  spec: SpecId,
  statement: z.string(),
  test_type: AcceptanceType,
  test_ref: TestRef.nullable(),
  status: AcceptanceStatus,
  flakiness_score: z.number().min(0).max(1),
  last_run_at: Iso8601.nullable(),
  run_history: z.array(RunResult),
  owner: UserId,
  proposed_by: z.union([UserId, AgentId]),
  accepted: z.boolean(),
  created_at: Iso8601,
});

// ─── Spec ──────────────────────────────────────────────────────────────────

export const Constraint = z.object({
  id: z.string(),
  text: z.string(),
  category: z.enum(['performance', 'compliance', 'compatibility', 'security', 'budget', 'other']),
  budget: z
    .object({
      metric: z.string(),
      op: z.enum(['<', '<=', '>', '>=']),
      value: z.number(),
      unit: z.string(),
    })
    .optional(),
});

export const OpenQuestion = z.object({
  id: z.string(),
  text: z.string(),
  state: z.enum(['open', 'resolved']),
  blocks_spawn: z.boolean(),
  resolved_by: UserId.optional(),
  resolved_at: Iso8601.optional(),
  resolution: z.string().optional(),
});

export const ReadinessWeights = z.object({
  acceptance_structure: z.number(),
  non_goals_present: z.number(),
  constraints_specific: z.number(),
  open_questions: z.number(),
  context_bundle: z.number(),
});

const readinessComponent = z.object({
  score: z.number(),
  max: z.number(),
  notes: z.array(z.string()),
});

export const ReadinessBreakdown = z.object({
  weights: ReadinessWeights,
  components: z.object({
    acceptance_structure: readinessComponent,
    non_goals_present: readinessComponent,
    constraints_specific: readinessComponent,
    open_questions: readinessComponent,
    context_bundle: readinessComponent,
  }),
  threshold: z.number(),
  gated: z.boolean(),
  computed_at: Iso8601,
});

export const Spec = z.object({
  id: SpecId,
  workspace: WorkspaceId,
  project: ProjectId,
  pitch: PitchId.nullable(),
  parent_spec: SpecId.nullable(),
  title: z.string(),
  slug: z.string(),

  status: SpecStatus,
  version: z.number().int().nonnegative(),
  head_sha: GitSha,

  intent: z.string().nullable(),
  non_goals: z.array(z.string()),
  constraints: z.array(Constraint),
  acceptance: z.array(AcceptanceCriterion),
  decisions: z.array(AdrId),
  open_questions: z.array(OpenQuestion),
  context_bundle: BundleId.nullable(),

  readiness_score: z.number().min(0).max(100),
  readiness_breakdown: ReadinessBreakdown,
  task_ids: z.array(TaskId),
  actor_summary: z.object({ humans: z.array(UserId), agents: z.array(AgentId) }),

  repo_path: z.string().nullable(),
  owner: UserId,
  created_at: Iso8601,
  created_by: UserId,
  updated_at: Iso8601,
  shipped_at: Iso8601.nullable(),
});

// ─── Task ──────────────────────────────────────────────────────────────────

export const Task = z.object({
  id: TaskId,
  workspace: WorkspaceId,
  parent_spec: SpecId,
  parent_task: TaskId.nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: TaskStatus,

  assignee: UserId,
  delegated_to: SessionId.nullable(),
  delegation_history: z.array(SessionId),

  blocks: z.array(TaskId),
  blocked_by: z.array(TaskId),

  context_bundle_override: BundleId.nullable(),

  agent_budget: z
    .object({
      acu_ceiling: z.number().nonnegative(),
      wall_clock_ceiling_sec: z.number().int().nonnegative(),
    })
    .nullable(),

  risk: RiskLevel,
  paths: z.array(z.string()),

  proposed_by: z.union([UserId, AgentId]),
  approved_by: UserId.nullable(),

  created_at: Iso8601,
  updated_at: Iso8601,
  completed_at: Iso8601.nullable(),
});

// ─── Workspace / user / agent ──────────────────────────────────────────────

export const Workspace = z.object({
  id: WorkspaceId,
  name: z.string(),
  slug: z.string(),
  plan: z.enum(['free', 'team', 'business']),
  acu_per_week: z.number().positive(),
  default_cool_down_weeks: z.number().int().positive(),
  default_bet_weeks: z.number().int().positive(),
  notification_model: z.enum(['digest', 'realtime']),
  spec_sync: z.object({
    enabled: z.boolean(),
    repo: RepoRef.nullable(),
    path_prefix: z.string(),
  }),
  adr_sync: z.object({
    enabled: z.boolean(),
    repo: RepoRef.nullable(),
    path_prefix: z.string(),
  }),
  created_at: Iso8601,
});

export const User = z.object({
  id: UserId,
  workspace: WorkspaceId,
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['admin', 'member', 'viewer']),
  created_at: Iso8601,
});

export const AgentIdentity = z.object({
  id: AgentId,
  workspace: WorkspaceId,
  handle: z.string(),
  model: z.string(),
  oauth_issuer: z.string(),
  owner: UserId,
  description: z.string().nullable(),
  approved: z.boolean(),
  trust_history: z.array(z.object({ project: ProjectId, tier: TrustTier, promoted_at: Iso8601 })),
  stats: z.object({
    sessions_total: z.number().int().nonnegative(),
    first_pass_rate: z.number().min(0).max(1),
    avg_cost_acu: z.number().nonnegative(),
    last_active: Iso8601,
  }),
});

// ─── Inferred TS types (consumer-facing) ───────────────────────────────────

export type SpecStatus = z.infer<typeof SpecStatus>;
export type TaskStatus = z.infer<typeof TaskStatus>;
export type SessionStatus = z.infer<typeof SessionStatus>;
export type AcceptanceStatus = z.infer<typeof AcceptanceStatus>;
export type AcceptanceType = z.infer<typeof AcceptanceType>;
export type RiskLevel = z.infer<typeof RiskLevel>;
export type TrustTier = z.infer<typeof TrustTier>;

export type TestRef = z.infer<typeof TestRef>;
export type RunResult = z.infer<typeof RunResult>;
export type AcceptanceCriterion = z.infer<typeof AcceptanceCriterion>;
export type Constraint = z.infer<typeof Constraint>;
export type OpenQuestion = z.infer<typeof OpenQuestion>;
export type ReadinessWeights = z.infer<typeof ReadinessWeights>;
export type ReadinessBreakdown = z.infer<typeof ReadinessBreakdown>;
export type Spec = z.infer<typeof Spec>;
export type Task = z.infer<typeof Task>;
export type Workspace = z.infer<typeof Workspace>;
export type User = z.infer<typeof User>;
export type AgentIdentity = z.infer<typeof AgentIdentity>;

export type WorkspaceId = z.infer<typeof WorkspaceId>;
export type ProjectId = z.infer<typeof ProjectId>;
export type UserId = z.infer<typeof UserId>;
export type AgentId = z.infer<typeof AgentId>;
export type SpecId = z.infer<typeof SpecId>;
export type TaskId = z.infer<typeof TaskId>;
export type SessionId = z.infer<typeof SessionId>;
export type PitchId = z.infer<typeof PitchId>;
export type AcceptanceId = z.infer<typeof AcceptanceId>;
export type AdrId = z.infer<typeof AdrId>;
export type BundleId = z.infer<typeof BundleId>;
export type EvidenceId = z.infer<typeof EvidenceId>;
export type ElicitId = z.infer<typeof ElicitId>;
export type ActivityId = z.infer<typeof ActivityId>;
