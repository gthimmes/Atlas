import { makeClaudeDrafter } from './claude.js';
import { mockDraft } from './drafter.js';
import { liftSpec } from './lifter.js';
import { connectAtlas } from './mcp.js';

// `make demo-agent` — the build-order M2 demo, one command:
// creates a fresh draft spec, prints where to watch it in the web UI,
// then lets the agent lift it over MCP while you watch the score climb.
// Uses Claude drafting when ANTHROPIC_API_KEY is set, mock otherwise.

const api = process.env['ATLAS_API_URL'] ?? 'http://localhost:5179';
const web = process.env['ATLAS_WEB_URL'] ?? 'http://localhost:5173';
const token = process.env['ATLAS_AGENT_TOKEN'] ?? 'atk_dev_agt_be';

async function getJson(path: string): Promise<any> {
  const res = await fetch(`${api}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}; is the API running? (make dev-api)`);
  return res.json();
}

const project = (await getJson('/v1/projects')).items[0];
const owner = (await getJson('/v1/users')).items[0];

const createRes = await fetch(`${api}/v1/tools/spec.create`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: `Demo: agent-lifted spec (${new Date().toISOString().slice(0, 16)})`,
    intent: 'Show a human watching an MCP agent co-author a spec to readiness.',
    project: project.id,
    owner: owner.id,
  }),
});
if (!createRes.ok) throw new Error(`spec.create failed: ${await createRes.text()}`);
const specId = ((await createRes.json()) as { id: string }).id;

console.log();
console.log(`  Created draft spec ${specId} (gated, readiness 10/70).`);
console.log(`  Watch it live: ${web}  → Spec editor → "${specId}"`);
console.log();

const usingClaude = Boolean(process.env['ANTHROPIC_API_KEY']);
console.log(
  usingClaude
    ? '  Drafting with Claude.'
    : '  No ANTHROPIC_API_KEY — using the deterministic mock drafter.',
);
console.log();

// Give the human a moment to get the spec open in the browser.
await new Promise((r) => setTimeout(r, 5000));

const atlas = await connectAtlas(api, token);
try {
  await liftSpec(atlas, specId, usingClaude ? makeClaudeDrafter() : mockDraft, {
    pauseMs: 1500,
    log: (line) => console.log(`  [agent] ${line}`),
  });
} finally {
  await atlas.close();
}
