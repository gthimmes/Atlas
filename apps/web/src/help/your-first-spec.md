# Your first spec

Atlas ships seeded with one spec (`spec_s142`) so the surfaces have
something to show. Walk through editing it to learn the loop.

## Step 1 — Open the Spec Editor

From the Work Graph, click the `spec_s142` tile, or press `S`. You'll see
the structured editor: intent, non-goals, constraints, acceptance, open
questions, and a **readiness panel** on the right.

## Step 2 — Edit the intent

The intent box is a textarea. Type anything. Atlas debounces your
keystrokes (500 ms) and posts a `spec.propose_edit` to the API. The server
appends a `spec.intent_edited` event to the event log, re-runs the
projection, recomputes readiness, and streams the fresh breakdown back to
you via SSE.

Watch the readiness panel on the right — the per-component bars update
live when the SSE event arrives.

## Step 3 — Watch the score move

The intent section is _not_ weighted in readiness, so editing it won't
change the score. Try one of the weighted sections instead (Phase 2 only
exposes the intent textarea for direct editing — other sections are
read-only for now, but the gate behaviour is still observable since
`spec_s142` is above 70).

See **The readiness gate** for the exact formula.

## Step 4 — Spawn a task

With readiness ≥ 70 and `gated = false`, the **+ Spawn task** button in
the editor header is enabled. Click it, fill in title + optional
description + risk, submit.

The task appears immediately in the Work Graph as a new chip under this
spec. See **Spawning tasks** for the details (state machine, risk, what
`approved_by` means).

## Step 5 — Transition a task

Back in the Work Graph, click any task chip to open the detail panel.
Change its status with the dropdown — illegal transitions are rejected by
the server. Marking it `done` auto-sets `completed_at`.

---

That's the full Phase 2 loop. Phase 3 adds agents who can do steps 2 and 4
on your behalf.
