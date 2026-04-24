# Projects

A **project** is the scope between _workspace_ and _spec_. Think of it as
one repo — or a meta-repo bundling related repos. A workspace has many
projects; each spec belongs to exactly one project.

## What a project scopes

Per `decisions.md §9`:

- **Repo refs** — a project maps 1:1 to a repository (or a meta-repo
  joining several). This is where `spec_sync` and `adr_sync` write
  Markdown back when enabled.
- **Trust tiers per agent** _(Phase 3+)_ — agent identities get tiers
  (L0 / L1 / L2) _per project_, not workspace-wide. `claude-backend`
  might be L1 in `payments` but L0 in `auth`.
- **Allowlist / blocklist** _(Phase 4+)_ — which paths an L1 agent can
  auto-merge on; which always require human review.
- **Ambient agents** _(Phase 3+)_ — long-running agents scoped to a
  project (ops monitor, reviewer bot).

## Switching projects

The project switcher is the breadcrumb next to the Atlas logo in the
nav. Click it to:

- **Change the active project** — filters the Work Graph to that
  project's specs. Persisted in localStorage.
- **+ New project** — inline create. Slug auto-generates from the name;
  you can edit it.
- **Manage projects** — opens the full list with spec counts + an inline
  create form.

## Creating a project

`POST /v1/tools/project.create` takes a slug (lowercase, `a-z0-9-` only)
and a name. Slug collisions within a workspace return 409.

The seeded Meridian workspace ships with one project: `Core` (`prj_core`).
If you `reset workspace` from the footer, the project survives — only
specs, tasks, and the event log are wiped. That way you can immediately
create a new spec under `Core` on the fresh graph.

## When you'd create a second project

Most single-product teams stay on one project forever. Reasons to add
more:

- You manage multiple repos (e.g. monolith + mobile apps + SDK).
- You want different trust tiers for the same agent in different
  codebases (safer on auth, looser on marketing site).
- You run ambient agents that should only operate on specific paths.

v1 does not support moving specs between projects. Pick deliberately.
