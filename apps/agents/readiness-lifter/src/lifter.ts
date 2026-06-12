import { planSections } from './drafter.js';
import type { AtlasMcp } from './mcp.js';
import type { Drafter, Spec } from './types.js';

export interface LiftResult {
  spec: Spec;
  startScore: number;
  finalScore: number;
  edits: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The core loop: read the spec, find the weakest readiness components,
 * draft those sections, propose each edit over MCP, and stop as soon as
 * the spec is no longer gated (or the plan is exhausted).
 */
export async function liftSpec(
  atlas: AtlasMcp,
  specId: string,
  drafter: Drafter,
  opts: { pauseMs?: number; log?: (line: string) => void } = {},
): Promise<LiftResult> {
  const log = opts.log ?? (() => {});
  const pauseMs = opts.pauseMs ?? 400;

  let spec = await atlas.readSpec(specId);
  const startScore = spec.readiness_breakdown.score;
  log(
    `spec ${specId} "${spec.title}" — readiness ${startScore}/${spec.readiness_breakdown.threshold}` +
      (spec.readiness_breakdown.gated ? ' (gated)' : ' (already ready)'),
  );

  let edits = 0;
  if (spec.readiness_breakdown.gated) {
    for (const section of planSections(spec.readiness_breakdown)) {
      const { patch, rationale } = await drafter(section, spec);
      log(`drafting ${section}: ${rationale}`);
      spec = await atlas.proposeEdit(specId, section, patch);
      edits += 1;
      log(`→ readiness ${spec.readiness_breakdown.score}/${spec.readiness_breakdown.threshold}`);
      if (!spec.readiness_breakdown.gated) break;
      // Small pause so humans watching the spec editor see the score climb
      // step by step rather than one jump.
      await sleep(pauseMs);
    }
  }

  log(
    spec.readiness_breakdown.gated
      ? `done what I can: ${spec.readiness_breakdown.score}/${spec.readiness_breakdown.threshold} — remaining components need a human (open questions / context bundle)`
      : `spec is ready: ${spec.readiness_breakdown.score} ≥ ${spec.readiness_breakdown.threshold}, gate lifted after ${edits} edit(s)`,
  );

  return { spec, startScore, finalScore: spec.readiness_breakdown.score, edits };
}
