/* Atlas — sample data. Meridian Payments (a fintech) is the demo product. */

const HUMANS = [
  { id: 'u1', name: 'Priya Shah',  role: 'Tech Lead' },
  { id: 'u2', name: 'Ana Reyes',   role: 'Backend' },
  { id: 'u3', name: 'Jonas Keller', role: 'Frontend' },
];

const AGENTS = [
  { id: 'a1', name: 'claude-backend',  model: 'claude-opus-4-7', owner: 'u1' },
  { id: 'a2', name: 'claude-frontend', model: 'claude-opus-4-7', owner: 'u3' },
  { id: 'a3', name: 'codex-migrations', model: 'gpt-5',          owner: 'u2' },
  { id: 'a4', name: 'cursor-refactor',  model: 'claude-sonnet-4-5', owner: 'u1' },
];

// Two pitches in flight
const PITCHES = [
  {
    id: 'P-14', title: 'Cut drop-off at address entry',
    appetite: 'Big · 6 weeks',
    status: 'in_flight',
    hill: 0.58,
  },
  {
    id: 'P-17', title: 'Ledger → Postgres migration',
    appetite: 'Big · 6 weeks',
    status: 'in_flight',
    hill: 0.32,
  },
];

const SPECS = [
  {
    id: 'S-142', title: 'Address autocomplete with fallback entry',
    pitch: 'P-14', status: 'in_flight', readiness: 87,
    owner: 'u3',
    intent: 'Reduce drop-off at address entry in the checkout flow by 30%, measured at the identity-verified state, without increasing downstream fraud failures.',
    nonGoals: ['International addresses outside US/CA/GB', 'Address validation for enterprise plans (separate spec)'],
    constraints: ['p95 < 120ms for autocomplete', 'No new PII stored beyond what Stripe Radar ingests', 'Must degrade to manual entry when provider is down'],
    acceptance: [
      { id: 'ac1', statement: 'Drop-off rate from step 2 → step 3 decreases by ≥30% (A/B, 14 days)', type: 'eval', status: 'generated', flakiness: 0.02, spark: [0.3, 0.4, 0.35, 0.5, 0.6, 0.55, 0.7] },
      { id: 'ac2', statement: 'Autocomplete p95 latency < 120ms (10k req)', type: 'property', status: 'passing', flakiness: 0.01, spark: [0.9, 0.85, 0.88, 0.92, 0.9, 0.88, 0.91] },
      { id: 'ac3', statement: 'Manual-entry fallback activates within 400ms of provider timeout', type: 'integration', status: 'passing', flakiness: 0.08, spark: [0.7, 0.9, 0.8, 0.85, 0.9, 0.95, 0.88] },
      { id: 'ac4', statement: 'No increase in Stripe Radar fraud score >0.5% over baseline', type: 'eval', status: 'unverified', flakiness: 0, spark: [] },
      { id: 'ac5', statement: 'BDD: user with ambiguous address ("main st") sees disambiguation UI', type: 'bdd', status: 'flaky', flakiness: 0.22, spark: [0.4, 0.6, 0.3, 0.7, 0.4, 0.5, 0.45] },
    ],
    decisions: [
      { id: 'ADR-37', title: 'Use Smarty over Google Places for US addresses', by: 'agent' },
      { id: 'ADR-39', title: 'Cache autocomplete responses for 24h', by: 'human' },
    ],
    openQuestions: [
      { id: 'q1', text: 'Do we treat PO boxes as valid for verification?', state: 'open' },
    ],
    contextBundle: { files: 47, adrs: 6, skills: 3, mcp: 4 },
  },
  {
    id: 'S-148', title: 'Ledger schema migration: v3 → v4',
    pitch: 'P-17', status: 'in_flight', readiness: 72,
    owner: 'u2',
    intent: 'Migrate the transaction ledger from v3 (wide-row) to v4 (normalized) with zero downtime. Enables per-line reconciliation and reduces nightly close by 40 minutes.',
    nonGoals: ['Backfill historical corrections older than FY2023', 'New public API (will follow in S-151)'],
    constraints: ['Dual-write window ≤ 72 hours', 'Zero dropped events during cutover', 'Rollback path to v3 must remain viable for 14 days post-cutover'],
    acceptance: [
      { id: 'ac6', statement: 'Dual-write consistency check passes for 1M+ events', type: 'integration', status: 'passing', flakiness: 0.03, spark: [0.85, 0.9, 0.92, 0.88, 0.9, 0.95, 0.93] },
      { id: 'ac7', statement: 'Cutover rehearsal completes in staging with zero errors', type: 'integration', status: 'generated', flakiness: 0, spark: [] },
      { id: 'ac8', statement: 'v3 readers continue to serve during dual-write', type: 'property', status: 'passing', flakiness: 0.01, spark: [0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95] },
      { id: 'ac9', statement: 'Rollback script restores v3 state in < 10 min', type: 'manual', status: 'unverified', flakiness: 0, spark: [] },
    ],
    decisions: [
      { id: 'ADR-41', title: 'Use CDC over dual-write at application layer', by: 'human' },
      { id: 'ADR-42', title: 'Retire v3 API after 14-day soak', by: 'agent' },
    ],
    openQuestions: [
      { id: 'q2', text: 'Do we freeze ledger-touching PRs during the cutover window?', state: 'open' },
      { id: 'q3', text: 'Who owns the rollback decision at T-0?', state: 'open' },
    ],
    contextBundle: { files: 82, adrs: 11, skills: 2, mcp: 5 },
  },
  { id: 'S-151', title: 'Public ledger API (v4)', status: 'shaped', readiness: 54, pitch: 'P-17', owner: 'u1' },
  { id: 'S-139', title: 'Radar rule: velocity on cards w/ mismatched BIN', status: 'shipped', readiness: 94, pitch: null, owner: 'u1' },
];

// Tasks (nodes in the work graph)
const TASKS = [
  // S-142 tree
  { id: 'T-812', spec: 'S-142', title: 'Smarty provider adapter',       assignee: 'u2', delegated: 'a1', status: 'review', risk: 'green',  paths: ['services/addresses/'] },
  { id: 'T-813', spec: 'S-142', title: 'Autocomplete UI component',     assignee: 'u3', delegated: 'a2', status: 'in_flight', risk: 'green', paths: ['web/checkout/'] },
  { id: 'T-814', spec: 'S-142', title: 'Disambiguation modal',          assignee: 'u3', delegated: null, status: 'in_flight', risk: 'green', paths: ['web/checkout/'] },
  { id: 'T-815', spec: 'S-142', title: 'Latency harness + regression',  assignee: 'u2', delegated: 'a1', status: 'done', risk: 'green', paths: ['perf/'] },
  { id: 'T-816', spec: 'S-142', title: 'Fraud-score evaluator',         assignee: 'u1', delegated: null, status: 'proposed', risk: 'amber', paths: ['fraud/'] },
  { id: 'T-817', spec: 'S-142', title: 'Feature flag + rollout',        assignee: 'u1', delegated: null, status: 'blocked', risk: 'green', paths: ['infra/flags/'] },

  // S-148 tree
  { id: 'T-820', spec: 'S-148', title: 'CDC pipeline from ledger v3',   assignee: 'u2', delegated: 'a3', status: 'in_flight', risk: 'red',   paths: ['migrations/', 'billing/'] },
  { id: 'T-821', spec: 'S-148', title: 'v4 schema + migrations',        assignee: 'u2', delegated: 'a3', status: 'review', risk: 'red',   paths: ['migrations/'] },
  { id: 'T-822', spec: 'S-148', title: 'Dual-write reconciliation job', assignee: 'u1', delegated: 'a1', status: 'in_flight', risk: 'amber', paths: ['billing/'] },
  { id: 'T-823', spec: 'S-148', title: 'v3 reader shim',                assignee: 'u2', delegated: 'a4', status: 'done', risk: 'green',  paths: ['billing/'] },
  { id: 'T-824', spec: 'S-148', title: 'Cutover runbook',               assignee: 'u1', delegated: null, status: 'in_flight', risk: 'green', paths: ['runbooks/'] },
  { id: 'T-825', spec: 'S-148', title: 'Rollback script',               assignee: 'u2', delegated: null, status: 'proposed', risk: 'red',   paths: ['migrations/'] },

  // S-151 future
  { id: 'T-830', spec: 'S-151', title: 'API shape draft',               assignee: 'u1', delegated: null, status: 'in_flight', risk: 'green', paths: ['api/'] },
];

// Agent sessions (active ones)
const SESSIONS = [
  {
    id: 'sess-3a9f', agent: 'a1', task: 'T-812', status: 'active',
    contextUsed: 38400, contextMax: 200000,
    cost: 2.14, elapsed: '24m',
    activities: [
      { t: '00:02', kind: 'read', text: 'services/addresses/provider.ts' },
      { t: '00:04', kind: 'read', text: 'services/addresses/test_fixtures/' },
      { t: '00:07', kind: 'tool', text: 'run: pnpm test --filter addresses' },
      { t: '00:09', kind: 'reason', text: 'Inferring rate-limit semantics from Smarty docs; adapter should expose retryable errors as a typed union.' },
      { t: '00:12', kind: 'edit',  text: 'services/addresses/smarty.ts  +142 −4' },
      { t: '00:14', kind: 'edit',  text: 'services/addresses/smarty.test.ts  +88' },
      { t: '00:19', kind: 'tool', text: 'run: pnpm test --filter addresses' },
      { t: '00:21', kind: 'decision', text: 'ADR-37: Smarty over Google Places (US only)' },
      { t: '00:24', kind: 'elicit', text: 'Should I treat military-address (APO/FPO) as ambiguous or reject?' },
    ],
  },
  {
    id: 'sess-7c21', agent: 'a3', task: 'T-820', status: 'active',
    contextUsed: 142000, contextMax: 200000,
    cost: 8.90, elapsed: '1h 48m',
    activities: [],
  },
  {
    id: 'sess-5e10', agent: 'a2', task: 'T-813', status: 'awaiting_input', cost: 0.88, elapsed: '18m', contextUsed: 22000, contextMax: 200000, activities: [] },
  {
    id: 'sess-2b11', agent: 'a4', task: 'T-823', status: 'complete', cost: 3.40, elapsed: '41m', contextUsed: 61000, contextMax: 200000, activities: [] },
];

// Digest (overnight PRs)
const DIGEST = [
  {
    id: 'd1', sess: 'sess-2b11', agent: 'a4', task: 'T-823',
    title: 'v3 reader shim — pass-through with feature flag',
    passed: 4, total: 4, risk: 'green', sample: false, merged: true,
    summary: ['Added shim module with flag-gated routing', 'Integration tests cover v3/v4 parity', 'No schema changes'],
    paths: ['billing/'],
    trust: 'L1',
  },
  {
    id: 'd2', sess: 'sess-8b02', agent: 'a1', task: 'T-815',
    title: 'Latency harness: synthetic 10k req replay',
    passed: 5, total: 5, risk: 'green', sample: true, merged: true,
    summary: ['New harness in perf/addresses.bench.ts', 'Baseline captured, committed', 'CI job added, 6min runtime'],
    paths: ['perf/'],
    trust: 'L1',
  },
  {
    id: 'd3', sess: 'sess-1a4e', agent: 'a2', task: 'T-814',
    title: 'Disambiguation modal — first draft',
    passed: 3, total: 5, risk: 'amber', sample: false, merged: false,
    summary: ['Modal component + hook', '2 acceptance chips generated, 2 failing', 'Deviation: did not add focus-trap (flagged)'],
    paths: ['web/checkout/'],
    trust: 'L0',
  },
  {
    id: 'd4', sess: 'sess-9f33', agent: 'a3', task: 'T-821',
    title: 'Ledger v4 schema + up/down migrations',
    passed: 6, total: 7, risk: 'red', sample: false, merged: false,
    summary: ['Touches migrations/ and billing/ (high-risk path)', 'Rollback test missing', '1 acceptance chip failing (rollback < 10min)'],
    paths: ['migrations/', 'billing/'],
    trust: 'L0',
  },
];

const CONSTITUTION = [
  { id: 'c1', text: 'No cross-service synchronous calls without circuit breaker.', severity: 'blocking' },
  { id: 'c2', text: 'Any change under billing/ or migrations/ requires human review regardless of tier.', severity: 'blocking' },
  { id: 'c3', text: 'ADRs are required for: new dependency, new database table, cross-service boundary.', severity: 'blocking' },
  { id: 'c4', text: 'No PII in logs. Redact before emit.', severity: 'blocking' },
  { id: 'c5', text: 'Prefer composition over inheritance in services/.', severity: 'advisory' },
];

Object.assign(window, {
  HUMANS, AGENTS, PITCHES, SPECS, TASKS, SESSIONS, DIGEST, CONSTITUTION,
});
