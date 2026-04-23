# Reading the Work Graph

This page decodes what's on your screen right now. The demo workspace is
**Meridian Payments** — a fintech running a "risk-aware auto-merge" bet.

## The big tile on the left

`spec_s142 · in_flight · Risk-aware auto-merge for L2 agents`

That's a **spec**. Everything to its right belongs to it.

- `spec_s142` — the spec's ID. Prefixes (`spec_`, `task_`, `usr_`, etc.) are
  how Atlas distinguishes types everywhere.
- `in_flight` — one of six spec statuses (_draft · shaped · ready ·
  in_flight · shipped · archived_). This one is mid-build.
- **92/100** pill — the spec's **readiness score**. Green means the score
  is ≥ the workspace threshold (default 70), so the spec is _not gated_ and
  you can spawn tasks. Amber means gated: spawn is blocked until readiness
  rises. See **The readiness gate**.
- `v14` — the spec is on its 14th version. Every edit bumps this.
- Click the tile to open the **Spec Editor** (keyboard: `S`).

## The chips on the right

Each chip is a **task** under the spec.

- Dot color = **risk** (green/amber/red). Set manually for now; from
  Phase 4 the risk classifier sets it automatically based on paths
  touched, lines changed, keywords like `payment`/`auth`/`migration`, etc.
- `done · review · in_flight · blocked` = **status**. Legal transitions are
  enforced — you can't go from `proposed` straight to `done`.
- Click a task chip to open the **Task detail panel** on the right.

## The dashed amber line

The line from `task_t511` to `task_t512` labeled **blocks** is a dependency
edge. `t512` is _blocked by_ `t511` — it can't start until `t511` is done.
Edges are derived from the tasks' `blocks`/`blocked_by` arrays.

## The slider at the bottom

The **time scrubber** filters the graph by task `created_at`. Drag left to
hide tasks created after that timestamp. Useful for "what did yesterday's
graph look like?" In Phase 5 this upgrades to a full event-sourced replay
— the whole graph (including readiness + spec versions) reconstructs at
the chosen time.

## The small controls at bottom-left

Pan, zoom, and fit-to-view for the graph canvas.

## Navigation

- Press `G` for Work graph, `S` for Spec editor, `R` for Agent run (Phase
  3), `D` for Digest (Phase 4).
- Press `?` anytime to open this help drawer.
