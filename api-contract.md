# Atlas — API Contract

Covers the `workspace://` MCP surface and the HTTP fallback. All
payload shapes are defined in `schema.ts`; this file describes the
endpoints, verbs, and error semantics.

## Transport

- **MCP** over HTTP+SSE for agent clients. Standard MCP verbs
  (`resources/list`, `resources/read`, `resources/subscribe`,
  `tools/call`). Capabilities advertised at handshake; tool
  availability depends on trust tier.
- **HTTP** REST for the web UI. Same resource URIs as MCP, prefixed
  `/v1/`, JSON over HTTPS. SSE for live streams.
- **Auth:** OAuth 2.1 with PKCE. Bearer tokens in `Authorization:
Bearer` header. Workspace-scoped; agent tokens carry project scopes.

## Error envelope (both transports)

```json
{
  "error": {
    "code": "E_POLICY_DENIED",
    "message": "Agent trust tier L0 cannot auto-merge",
    "retryable": false,
    "trace_id": "9f2e1-…"
  }
}
```

Codes: `E_POLICY_DENIED`, `E_BUDGET_EXCEEDED`, `E_CONTEXT_STALE`,
`E_ELICIT_TIMEOUT`, `E_SCHEMA_MISMATCH`, `E_SESSION_STALE`,
`E_MCP_TIMEOUT`, `E_NOT_FOUND`, `E_CONFLICT`, `E_RATE_LIMITED`.

## Resources — read

| URI                                  | HTTP                                           | Returns                    |
| ------------------------------------ | ---------------------------------------------- | -------------------------- |
| `workspace://specs`                  | `GET /v1/specs?project=…&status=…`             | `Spec[]` (paginated)       |
| `workspace://specs/{id}`             | `GET /v1/specs/{id}`                           | `Spec`                     |
| `workspace://specs/{id}/readiness`   | `GET /v1/specs/{id}/readiness` + SSE subscribe | `ReadinessBreakdown`       |
| `workspace://specs/{id}/living`      | `GET /v1/specs/{id}/living`                    | `LivingArtifactView`       |
| `workspace://tasks`                  | `GET /v1/tasks?spec=…&status=…`                | `Task[]`                   |
| `workspace://tasks/{id}`             | `GET /v1/tasks/{id}`                           | `Task`                     |
| `workspace://tasks/{id}/activity`    | `GET /v1/tasks/{id}/activity` + SSE            | `Activity[]`               |
| `workspace://sessions/{id}`          | `GET /v1/sessions/{id}`                        | `AgentSession`             |
| `workspace://sessions/{id}/activity` | `GET /v1/sessions/{id}/activity` + SSE         | `Activity[]`               |
| `workspace://bundles/{id}`           | `GET /v1/bundles/{id}`                         | `ContextBundle`            |
| `workspace://bundles/{id}/resolved`  | `GET /v1/bundles/{id}/resolved`                | Resolved file list + blobs |
| `workspace://pitches`                | `GET /v1/pitches`                              | `Pitch[]`                  |
| `workspace://pitches/{id}`           | `GET /v1/pitches/{id}`                         | `Pitch`                    |
| `workspace://adrs`                   | `GET /v1/adrs?tag=…`                           | `Adr[]`                    |
| `workspace://adrs/{id}`              | `GET /v1/adrs/{id}`                            | `Adr`                      |
| `workspace://graph`                  | `GET /v1/graph?root=…&depth=…`                 | Nodes + `GraphEdge[]`      |
| `workspace://digest/{date}`          | `GET /v1/digest/{yyyy-mm-dd}`                  | `DigestItem[]`             |
| `workspace://constitution`           | `GET /v1/constitution`                         | `Constitution`             |
| `workspace://metrics`                | `GET /v1/metrics?period=…`                     | `WorkspaceMetrics`         |

### Pagination

All list endpoints: `?cursor=<opaque>&limit=<int, ≤200>`. Response
envelope: `{ items: T[], next_cursor: string | null }`.

### SSE events

`text/event-stream`, `event:` names listed with their resources:

- `readiness.updated` → `ReadinessBreakdown`
- `session.activity` → `Activity`
- `session.status` → `{ session: SessionId, status: SessionStatus }`
- `digest.item_added` → `DigestItem`
- `graph.edge_added` → `GraphEdge`

Reconnect with `Last-Event-ID` header (standard).

## Tools — mutations

All mutations go through MCP tools (never direct resource `write`).
HTTP equivalent is `POST /v1/tools/{tool}` with same JSON payload.

| Tool                   | Payload                                                | Returns                | Policy                                                 |
| ---------------------- | ------------------------------------------------------ | ---------------------- | ------------------------------------------------------ |
| `spec.propose_edit`    | `{ spec, section, patch }`                             | `Spec` (new ver)       | humans + agents; bundled into 500ms debounce           |
| `spec.accept_edit`     | `{ spec, version }`                                    | `Spec`                 | humans only if agent proposed                          |
| `task.create`          | `{ spec, title, description, ... }`                    | `Task`                 | humans always; agents require approved_by after create |
| `task.claim`           | `{ task, as: session }`                                | `Task`                 | agent must match trust tier + task risk                |
| `task.submit_evidence` | `{ task, session, evidence }`                          | `VerificationEvidence` | see §3 decisions.md                                    |
| `session.start`        | `{ agent, task, budget, skills }`                      | `AgentSession`         | task must have `approved_by`                           |
| `session.heartbeat`    | `{ session }`                                          | `{ok}`                 | auto by SDK                                            |
| `session.complete`     | `{ session, evidence_id }`                             | `AgentSession`         | all acceptance must pass                               |
| `elicit.ask`           | `{ session, question, options?, writes_back_to_spec }` | `Elicitation`          | any session                                            |
| `elicit.answer`        | `{ elicit, answer }`                                   | `Elicitation`          | humans only                                            |
| `adr.emit`             | `Adr minus computed fields`                            | `Adr`                  | any actor; agents' need human review if severity       |
| `bundle.create`        | `ContextBundle payload`                                | `ContextBundle`        | humans + agents                                        |
| `bundle.resolve`       | `{ bundle }`                                           | resolved file list     | idempotent                                             |
| `pitch.schedule`       | `{ pitch }`                                            | `Pitch` + `Spec`       | admins; derives ACU budget                             |
| `pitch.move_hill`      | `{ pitch, track, position }`                           | `Pitch`                | stakeholders                                           |
| `trust.promote`        | `{ agent, project, tier }`                             | `TrustPolicy`          | admins; requires first_pass_rate ≥ 0.85 over last 20   |
| `constitution.amend`   | `{ clause_id, text, severity }`                        | `Constitution`         | admins                                                 |

## Rate limits

- Per-token bucket: 100 req/sec read, 20 req/sec write.
- Per-session ACU ceiling enforced on every tool call that has
  `cost_acu > 0`; cost attributed to the session's budget in
  `AgentSession.cost_acu`.

## Webhooks (outbound)

Workspace admins can register:

- `digest.ready` — fires when the morning digest is materialized.
- `session.error` — unrecoverable session errors.
- `deploy.rolled_back` — for incident response.

Signed with HMAC-SHA256; signature in `X-Atlas-Signature` header.

## Versioning

- URL version: `/v1/…`. Breaking changes require `/v2/`.
- MCP server advertises `server_info.version = "1.x.y"` at handshake.
- Schema evolution: additive only within v1. New enum values are
  additive; clients must tolerate unknown values.
