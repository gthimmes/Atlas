import type { DraftableSection, ReadinessBreakdown, SectionPatch, Spec } from './types.js';

// Which readiness component backs which spec section. open_questions and
// context_bundle are deliberately absent: resolving a human's blocking
// question or attaching a context bundle are judgment calls this agent
// must not fake (decisions.md §1 lists them; humans own them).
const COMPONENT_TO_SECTION: ReadonlyArray<
  [keyof ReadinessBreakdown['components'], DraftableSection]
> = [
  ['acceptance_structure', 'acceptance'],
  ['non_goals_present', 'non_goals'],
  ['constraints_specific', 'constraints'],
];

/**
 * Rank draftable sections by missing readiness points, biggest gap first.
 * Sections already at full credit are excluded.
 */
export function planSections(breakdown: ReadinessBreakdown): DraftableSection[] {
  return COMPONENT_TO_SECTION.map(([component, section]) => {
    const c = breakdown.components[component];
    return { section, missing: c.max - c.score };
  })
    .filter((s) => s.missing > 0)
    .sort((a, b) => b.missing - a.missing)
    .map((s) => s.section);
}

/**
 * Deterministic drafter used by --mock runs and Playwright playback.
 * Content is generic but rubric-complete: 2 non-goals ≥5 words, 1
 * constraint with a numeric budget, 3 acceptance criteria with ≥1
 * integration test_type.
 */
export async function mockDraft(section: DraftableSection, spec: Spec): Promise<SectionPatch> {
  switch (section) {
    case 'non_goals':
      return {
        section,
        patch: {
          non_goals: [
            ...spec.non_goals,
            'No mobile or native app surface ships in this release',
            'No two-way Git synchronization of spec content in v1',
          ],
        },
        rationale: 'added 2 qualifying non-goals (≥5 words each)',
      };
    case 'constraints':
      return {
        section,
        patch: {
          constraints: [
            ...spec.constraints,
            {
              id: `con_lift_${spec.constraints.length + 1}`,
              text: 'Readiness recompute completes within 500ms p99 on every spec mutation',
              category: 'performance',
              budget: { metric: 'p99_latency_ms', op: '<=', value: 500 },
            },
          ],
        },
        rationale: 'added a constraint with a numeric budget',
      };
    case 'acceptance':
      return {
        section,
        patch: {
          acceptance: [
            ...spec.acceptance,
            {
              id: 'ac_lift_1',
              statement: `${spec.title} behavior is verified end-to-end against a live backend`,
              test_type: 'integration',
              status: 'pending',
            },
            {
              id: 'ac_lift_2',
              statement:
                'Readiness SSE stream emits the updated breakdown after each accepted edit',
              test_type: 'integration',
              status: 'pending',
            },
            {
              id: 'ac_lift_3',
              statement:
                'A reviewer can confirm the change from the spec editor without console access',
              test_type: 'manual',
              status: 'pending',
            },
          ],
        },
        rationale: 'added 3 acceptance criteria incl. integration coverage',
      };
  }
}
