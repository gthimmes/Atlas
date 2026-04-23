# Fixtures

Seed data matching `../schema.ts`. Load these at boot to populate a
fresh Atlas workspace with the Meridian Payments reference scenario.

## Files

- **`workspace.json`** — one workspace, 3 users, 4 agent identities.
- **`specs-and-tasks.json`** — one in-flight spec (S-142, risk-aware
  auto-merge), 4 tasks across human and agent assignees, with full
  acceptance criteria and readiness breakdown.

## Load order

1. `workspace.json` (workspace → users → agents)
2. `specs-and-tasks.json` (spec → tasks; acceptance is embedded)

## Extending

Additional fixtures to add as milestones land:

- `sessions.json` (M3): agent sessions + activity
- `bundles.json` (M3): context bundles
- `pitches.json` (M5): pitches with hill tracks
- `digest.json` (M4): a morning's worth of digest items
- `adrs.json` (M6): decision log
- `constitution.json` (M6): clauses

Keep all fixtures self-consistent — every foreign key must resolve.
