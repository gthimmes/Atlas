# The readiness gate

A spec has a **readiness score** from 0–100. Below the workspace
threshold (default 70) the spec is **gated** — you can't spawn tasks from
it. This forces specs to be well-formed before agents (or humans) start
building against them.

## Formula (decisions.md §1)

Five components, each weighted, with linear partial credit.

| Component             | Weight | Full credit when…                                                 |
| --------------------- | -----: | ----------------------------------------------------------------- |
| Acceptance structure  |     40 | ≥ 3 criteria, at least one `property` or `integration`            |
| Non-goals present     |     20 | ≥ 2 non-goals, each ≥ 5 words                                     |
| Constraints specific  |     20 | ≥ 1 constraint with a numeric budget (metric + op + value + unit) |
| Open questions closed |     10 | All questions marked `blocks_spawn: true` are resolved            |
| Context bundle        |     10 | Bundle attached, within token ceiling, ≥ 1 inclusion rule         |

Total = 100. Threshold = 70. Gated = score < threshold.

## Key edge cases

- **Empty spec scores 10.** No blocking questions → full 10 on the
  _Open questions_ component. Still gated; 10 < 70.
- **Three vague criteria** (no `property`/`integration` test type) caps
  the acceptance component at **32 / 40**.
- **Non-goals under 5 words** don't count. This is on purpose — "not a
  real non-goal" is the biggest anti-pattern Atlas is trying to prevent.

## Why gate at all?

Without the gate, you ship Kiro's "16 acceptance criteria including 'As a
developer I want the transformation function to handle edge cases
gracefully'" pathology. The gate makes vagueness expensive — you can't
move forward until the spec is specific enough that an agent could
actually execute against it.

## Adjusting

Workspace admins can adjust the threshold 50–90 in 5-point steps. Weights
are also workspace-configurable but seeded to the defaults above.
