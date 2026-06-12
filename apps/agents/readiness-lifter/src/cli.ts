import { makeClaudeDrafter } from './claude.js';
import { mockDraft } from './drafter.js';
import { liftSpec } from './lifter.js';
import { connectAtlas } from './mcp.js';
import type { Drafter } from './types.js';

// Usage:
//   pnpm --filter @atlas/readiness-lifter start -- --spec spec_xyz [--mock]
//     [--api http://localhost:5179] [--token atk_dev_agt_be] [--pause 400]
//
// Real mode needs ANTHROPIC_API_KEY. Mock mode is deterministic and is what
// the Playwright playback suite drives.

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const has = (name: string) => process.argv.includes(`--${name}`);

async function main(): Promise<number> {
  const specId = arg('spec');
  if (!specId) {
    console.error(
      'usage: readiness-lifter --spec <spec_id> [--mock] [--api <url>] [--token <atk_*>]',
    );
    return 2;
  }

  const api = arg('api') ?? process.env['ATLAS_API_URL'] ?? 'http://localhost:5179';
  const token = arg('token') ?? process.env['ATLAS_AGENT_TOKEN'] ?? 'atk_dev_agt_be';
  const pauseMs = Number(arg('pause') ?? 400);

  let drafter: Drafter;
  if (has('mock')) {
    drafter = mockDraft;
  } else if (process.env['ANTHROPIC_API_KEY']) {
    drafter = makeClaudeDrafter();
  } else {
    console.error('ANTHROPIC_API_KEY is not set; pass --mock for the deterministic drafter.');
    return 2;
  }

  const atlas = await connectAtlas(api, token);
  try {
    const result = await liftSpec(atlas, specId, drafter, {
      pauseMs,
      log: (line) => console.log(`[readiness-lifter] ${line}`),
    });
    return result.spec.readiness_breakdown.gated ? 1 : 0;
  } finally {
    await atlas.close();
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error('[readiness-lifter] fatal:', err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
