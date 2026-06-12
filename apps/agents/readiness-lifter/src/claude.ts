import Anthropic from '@anthropic-ai/sdk';
import type { DraftableSection, SectionPatch, Spec } from './types.js';

const MODEL = process.env['ATLAS_AGENT_MODEL'] ?? 'claude-fable-5';

const SECTION_BRIEFS: Record<DraftableSection, string> = {
  non_goals: `Draft the "non_goals" array (strings). Keep existing entries, add enough so at least 2 entries have 5+ words. Non-goals must be plausible scope exclusions for THIS spec, not filler.
Return shape: {"non_goals": ["...", "..."]}`,
  constraints: `Draft the "constraints" array. Keep existing entries, add at least one constraint with a numeric budget.
Each constraint: {"id": "con_<slug>", "text": "...", "category": "performance|security|compat|cost|other", "budget": {"metric": "<snake_case_metric>", "op": "<=|<|>=|>", "value": <number>}}
Return shape: {"constraints": [...]}`,
  acceptance: `Draft the "acceptance" array. Keep existing entries; the final array needs 3+ criteria and at least one with test_type "integration" or "property".
Each criterion: {"id": "ac_<slug>", "statement": "<testable claim>", "test_type": "property|integration|bdd|manual|eval", "status": "pending"}
Statements must be concrete and testable against THIS spec's intent, not generic.
Return shape: {"acceptance": [...]}`,
};

/**
 * Claude-backed drafter: one Messages API call per section, strict-JSON
 * output parsed and passed to spec.propose_edit. Requires ANTHROPIC_API_KEY.
 */
export function makeClaudeDrafter(): (s: DraftableSection, spec: Spec) => Promise<SectionPatch> {
  const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY

  return async (section, spec) => {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system:
        'You are an Atlas workspace agent drafting spec sections so the spec reaches readiness threshold. ' +
        'Atlas specs gate agent work until acceptance criteria, non-goals and constraints are concrete. ' +
        'Respond with a single JSON object and nothing else — no prose, no code fences.',
      messages: [
        {
          role: 'user',
          content: [
            `Spec title: ${spec.title}`,
            `Spec intent: ${spec.intent ?? '(none written yet)'}`,
            `Current non_goals: ${JSON.stringify(spec.non_goals)}`,
            `Current constraints: ${JSON.stringify(spec.constraints)}`,
            `Current acceptance: ${JSON.stringify(spec.acceptance)}`,
            '',
            SECTION_BRIEFS[section],
          ].join('\n'),
        },
      ],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    const patch = JSON.parse(stripFences(text)) as Record<string, unknown>;
    return { section, patch, rationale: `drafted by ${MODEL}` };
  };
}

function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/m.exec(trimmed);
  return fenced?.[1] ?? trimmed;
}
