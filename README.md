# Atlas

A spec-native workspace where humans and agents collaborate on software
projects as equal first-class actors. Built against the handoff in this
repo.

## Current state

- **Phase 0** (foundations) — monorepo scaffolding, CI, three-tier test
  harness, schema codegen, fixture seed.
- **Phase 1** (spec viewer + editor) — event-sourced spec aggregate,
  `decisions.md §1` readiness formula, section-scoped `spec.propose_edit`,
  SSE on readiness changes, Spec Editor + read-only Work Graph surfaces.
- **Phase 2** (tasks + interactive graph) — task CRUD via tools, legal
  state-machine transitions, readiness-gated spawn, react-flow Work Graph
  with `blocks` edges + 7-day time scrubber, Task detail panel.
- **Phase 3.1** (MCP endpoint + first real agent) — `workspace://` MCP
  server at `/mcp` (resources + `spec.propose_edit` / `task.create` /
  `task.update` tools) behind agent bearer tokens; the `readiness-lifter`
  demo agent connects over MCP and lifts a gated spec past threshold while
  the Spec Editor updates live (`make demo-agent`). This is build-order
  M2's exit criterion.
- **Phase 3.2+** — OAuth 2.1 + PKCE (OpenIddict), `@atlas/agent-sdk`,
  agent sessions, verification evidence, morning digest. Not built yet.

## Quick start

```sh
make install   # install Node + .NET deps (first time only)
make db-up     # start Postgres in Docker
make seed      # run migrations + load fixtures/ into the db
make dev-api   # terminal 1: run the API with hot reload
make dev-web   # terminal 2: run the web UI
make test      # unit + integration + playback (Playwright)
```

Then open http://localhost:5173.

## Repository layout

```
.
├── atlas-spec.md          authoritative · product spec
├── api-contract.md        authoritative · MCP + HTTP surface
├── decisions.md           authoritative · binding rulings
├── build-order.md         authoritative · milestone plan
├── schema.ts              authoritative · 11 primitives
├── fixtures/              seed data (Meridian Payments scenario)
├── docs/design/           illustrative · prototype + low-fi + design canvas
├── packages/
│   ├── schema/            Zod validators + inferred TS types
│   └── schema-codegen/    ts-morph → apps/api/Atlas.Api/Generated/Schema.g.cs
├── apps/
│   ├── api/               ASP.NET Core 10 minimal API, Dapper + Postgres
│   │   ├── Atlas.Api/       domain, endpoints, MCP server, event log, projections
│   │   └── Atlas.Api.Tests/ xUnit + FluentAssertions + Testcontainers
│   ├── agents/
│   │   └── readiness-lifter/  demo MCP agent (mock + Claude drafting)
│   ├── web/               Vite + React 18 + TS + @xyflow/react
│   └── e2e/               Playwright (Chromium + WebKit)
├── Atlas.slnx             dotnet solution (slnx format)
├── pnpm-workspace.yaml    TS workspaces
├── docker-compose.yml     Postgres 16
└── Makefile               cross-stack orchestration
```

`@atlas/agent-sdk` and a shared `packages/ui-tokens` land with their
consumers in later phases. Web UI tokens currently live in
`apps/web/src/tokens.css`.

## Handoff reading order

The authoritative docs at the repo root are binding. The original
design handoff brief (illustrative) lives in `docs/design/`:

1. `atlas-spec.md` — product spec + §13 open questions (all resolved in decisions.md)
2. `decisions.md` — binding rulings
3. `schema.ts` — canonical types
4. `api-contract.md` — endpoint + tool contract
5. `build-order.md` — milestone plan
6. `docs/design/prototype/Atlas.html` — clickable hi-fi prototype
7. `docs/design/Atlas Handoff.html` — low-fi + states
8. `fixtures/` — seed data

## Stack

- **Backend:** C# / .NET 10, ASP.NET Core minimal APIs, Dapper + Npgsql,
  FluentMigrator, Serilog, native SSE. MCP server via the official
  ModelContextProtocol .NET SDK (stateless streamable HTTP). OpenIddict
  OAuth lands in a later Phase 3 slice.
- **Frontend:** Vite + React 18 + TypeScript strict, `@xyflow/react` for
  the Work Graph, Zustand for local state (adopted as needed), plain CSS
  variables for theming.
- **SDK:** TypeScript, `@atlas/agent-sdk` (Phase 3).
- **DB:** Postgres 16, event-sourced `event_log` + projected read-model
  tables. Every mutation appends an event and updates the read model in a
  single transaction.
- **Tests:** xUnit + FluentAssertions + Testcontainers on the backend
  (unit + integration); Vitest + Testing Library on the TS side; Playwright
  Chromium + WebKit for playback. Traces retained on failure.
- **Schema flow:** `schema.ts` is the source of truth; ts-morph regenerates
  C# records into `apps/api/Atlas.Api/Generated/`; CI runs a drift check.

## Live endpoints (Phase 2)

- `GET /v1/health`, `GET /v1/health/db`
- `GET /v1/specs`, `GET /v1/specs/{id}`, `GET /v1/specs/{id}/readiness`
  (JSON or `text/event-stream` for live updates)
- `GET /v1/tasks`, `GET /v1/tasks/{id}`
- `POST /v1/tools/spec.propose_edit` — section-scoped patches
- `POST /v1/tools/task.create` — rejects with `E_POLICY_DENIED` on gated spec
- `POST /v1/tools/task.update` — enforces state-machine transitions

## MCP endpoint (Phase 3.1)

`/mcp` hosts the `workspace://` MCP server (streamable HTTP, stateless).
Agents authenticate with bearer tokens (`Authorization: Bearer atk_*`);
the seeder issues deterministic dev tokens per fixture agent
(`atk_dev_<agent_id>`, e.g. `atk_dev_agt_be`) — local only, replaced by
OAuth 2.1 + PKCE in a later slice. The `/v1` HTTP surface stays open for
the web UI until then.

- **Resources:** `workspace://specs`, `workspace://specs/{id}`,
  `workspace://specs/{id}/readiness`, `workspace://tasks`,
  `workspace://tasks/{id}`
- **Tools:** `spec.propose_edit`, `task.create`, `task.update` — same
  domain services as the HTTP tools; tool failures return
  `isError: true` with an `E_*`-prefixed message (`E_POLICY_DENIED`,
  `E_NOT_FOUND`, `E_SCHEMA_MISMATCH`)
- Mutations through MCP are attributed to the token's agent identity in
  the event log and the spec's `actor_summary`.

**Demo:** `make demo-agent` creates a draft spec and the
`readiness-lifter` agent lifts it past threshold 70 over MCP while you
watch the score climb in the Spec Editor (SSE). With `ANTHROPIC_API_KEY`
set the sections are drafted by Claude; without it a deterministic mock
drafter is used (same code path the Playwright playback suite drives).
