# Atlas

A spec-native workspace where humans and agents collaborate on software
projects as equal first-class actors. Built against the handoff in this
repo.

## Quick start

```sh
make install   # install Node + .NET deps (first time only)
make db-up     # start Postgres in Docker
make seed      # load fixtures/ into the db
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
│   ├── schema/            published re-export of schema.ts + Zod parsers
│   ├── schema-codegen/    ts-morph → Generated/Schema.g.cs
│   ├── agent-sdk/         @atlas/agent-sdk (Phase 3+)
│   └── ui-tokens/         dark + light tokens
├── apps/
│   ├── api/               ASP.NET Core minimal API, MCP server, Dapper + Postgres
│   ├── web/               Vite + React + TS UI
│   └── e2e/               Playwright playback tests
├── Atlas.sln              dotnet solution
├── pnpm-workspace.yaml    TS workspaces
├── docker-compose.yml     Postgres
└── Makefile               cross-stack orchestration
```

## Handoff reading order

See the authoritative docs at the repo root. The original handoff brief
lives in `docs/design/`:

1. `atlas-spec.md` — product spec + §13 open questions (all resolved in decisions.md)
2. `decisions.md` — binding rulings
3. `schema.ts` — canonical types
4. `api-contract.md` — endpoint + tool contract
5. `build-order.md` — milestone plan
6. `docs/design/prototype/Atlas.html` — clickable hi-fi prototype
7. `docs/design/Atlas Handoff.html` — low-fi + states
8. `fixtures/` — seed data

## Stack

- **Backend:** C# / .NET 10, ASP.NET Core minimal APIs, Dapper, Npgsql,
  OpenIddict (Phase 3+), native SSE, ModelContextProtocol.NET.
- **Frontend:** Vite + React 18 + TypeScript strict.
- **SDK:** TypeScript (`@atlas/agent-sdk`).
- **DB:** Postgres 16, FluentMigrator, event-sourced tables + materialized views.
- **Tests:** xUnit + FluentAssertions + Testcontainers + WireMock.NET
  (backend); Vitest + MSW + Testing Library (TS); Playwright Chromium +
  WebKit (playback).
- **Schema flow:** `schema.ts` is the source of truth; ts-morph regenerates
  C# records on every build; CI fails on drift.
