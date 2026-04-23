# Spawning tasks

A task is an actionable slice of a spec. It has one accountable human, an
optional delegated agent session (Phase 3+), a risk level, and a status
that moves through a state machine.

## Requirements

- The parent spec must **not be gated** (readiness ≥ threshold). The
  server rejects `task.create` on a gated spec with `E_POLICY_DENIED`.
- Humans can create tasks freely. Agent-proposed tasks require an explicit
  `approved_by` before they become actionable (enforced in Phase 3+).

## Fields

- **Title** (required, ≤ 200 chars).
- **Description** (optional).
- **Assignee** (required, always a human — the accountable party).
- **Risk** — one of `green`, `amber`, `red`. Rules-based classifier
  derives this automatically from Phase 4. For Phase 2 you set it by hand.
- **Paths** — repo paths this task touches. Used by the Phase 4 risk
  classifier and trust policies.

## Status state machine

```
 proposed  →  ready            →  in_flight  →  review   →  done
    ↓           ↓         ↓          ↓           ↑
 cancelled   blocked  cancelled   blocked     (rework)
                ↓                    ↓
              ready               cancelled
```

`done` and `cancelled` are terminal. The server rejects illegal
transitions with `E_POLICY_DENIED`. Moving to `done` auto-sets
`completed_at`.

## Risk — what the dots mean

- 🟢 **green** — low-risk path (not auth/payments/migrations/pii); small
  change; no new production dependency.
- 🟡 **amber** — touches public API, > 150 lines, dev-only dep, PII in
  tests only.
- 🔴 **red** — touches `auth/`, `payments/`, `migrations/`, or `pii/`;
  schema change; new production dependency; > 500 lines.

Red tasks always require human review regardless of agent trust tier
(Phase 4). Amber tasks auto-hold for a configurable window.

## blocks / blocked_by

Tasks can block each other. A `blocks` edge renders as a dashed amber
line in the Work Graph. A task with unresolved `blocked_by` can't move
into `ready` or `in_flight` cleanly — it sits in `blocked` until the
blocker closes.
