# Acceptance criteria

Acceptance criteria are the most load-bearing primitive in Atlas. Each one
is a testable claim inside a spec, with a **status chip** reflecting the
latest automated test run.

## Status chips

| Chip         | Meaning                                                        |
| ------------ | -------------------------------------------------------------- |
| `unverified` | No test ref yet. Humans write the statement; tests come later. |
| `generated`  | Agent proposed a test; hasn't run (or hasn't been accepted).   |
| `passing`    | Test ran and passed on the latest commit.                      |
| `failing`    | Test ran and failed.                                           |
| `flaky`      | Rolling flakiness score ≥ 20% over the last N runs.            |

## Test types

Each criterion declares a `test_type`:

- **`property`** — randomized input / invariant. Strongest signal.
- **`integration`** — real dependencies, realistic scenario.
- **`bdd`** — user-facing behavior, often a Playwright run.
- **`manual`** — a human has to verify. No automation.
- **`eval`** — ML-style evaluation (agent quality, drift, etc.).

## Why this matters

The "review bottleneck" is the top-ranked failure mode in agent-heavy
teams (Faros AI's telemetry: +98% PRs merged, +91-441% review time).
Atlas's bet is that reviewers should review **criterion satisfaction**,
not diffs. A spec with three green `property` or `integration` chips is
merge-worthy; one with five `unverified` chips is not, no matter how good
the diff looks.

## Readiness weight

Acceptance is the heaviest readiness component (**40 / 100**). To hit full
credit you need ≥ 3 criteria with at least one `property` or `integration`
type. Without a `property`/`integration` criterion, the component caps at
**0.8 × 40 = 32**.

Full formula: see **The readiness gate**.
