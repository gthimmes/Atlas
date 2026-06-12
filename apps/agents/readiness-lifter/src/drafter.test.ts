import { describe, expect, it } from 'vitest';
import { mockDraft, planSections } from './drafter.js';
import type { ReadinessBreakdown, Spec } from './types.js';

const breakdown = (over: Partial<ReadinessBreakdown['components']> = {}): ReadinessBreakdown => ({
  components: {
    acceptance_structure: { score: 0, max: 40, notes: [] },
    non_goals_present: { score: 0, max: 20, notes: [] },
    constraints_specific: { score: 0, max: 20, notes: [] },
    open_questions: { score: 10, max: 10, notes: [] },
    context_bundle: { score: 0, max: 10, notes: [] },
    ...over,
  },
  threshold: 70,
  gated: true,
  score: 10,
});

const emptySpec: Spec = {
  id: 'spec_x',
  title: 'Test spec',
  intent: null,
  non_goals: [],
  constraints: [],
  acceptance: [],
  open_questions: [],
  readiness_breakdown: breakdown(),
};

describe('planSections', () => {
  it('orders draftable sections by missing points, biggest gap first', () => {
    expect(planSections(breakdown())).toEqual(['acceptance', 'non_goals', 'constraints']);
  });

  it('skips sections already at full credit', () => {
    const b = breakdown({
      acceptance_structure: { score: 40, max: 40, notes: [] },
      non_goals_present: { score: 20, max: 20, notes: [] },
    });
    expect(planSections(b)).toEqual(['constraints']);
  });

  it('never plans open_questions or context_bundle (human judgment)', () => {
    const b = breakdown({
      acceptance_structure: { score: 40, max: 40, notes: [] },
      non_goals_present: { score: 20, max: 20, notes: [] },
      constraints_specific: { score: 20, max: 20, notes: [] },
      open_questions: { score: 0, max: 10, notes: [] },
    });
    expect(planSections(b)).toEqual([]);
  });
});

describe('mockDraft (rubric-complete per decisions.md §1)', () => {
  it('non_goals: produces ≥2 entries of ≥5 words', async () => {
    const { patch } = await mockDraft('non_goals', emptySpec);
    const nonGoals = patch['non_goals'] as string[];
    const qualifying = nonGoals.filter((n) => n.split(/\s+/).length >= 5);
    expect(qualifying.length).toBeGreaterThanOrEqual(2);
  });

  it('non_goals: preserves existing entries', async () => {
    const spec = { ...emptySpec, non_goals: ['Existing non-goal stays right here'] };
    const { patch } = await mockDraft('non_goals', spec);
    expect((patch['non_goals'] as string[])[0]).toBe('Existing non-goal stays right here');
  });

  it('constraints: produces ≥1 constraint with a numeric budget', async () => {
    const { patch } = await mockDraft('constraints', emptySpec);
    const constraints = patch['constraints'] as Array<{
      budget?: { metric: string; op: string; value: number };
    }>;
    const budgeted = constraints.filter(
      (c) => c.budget && typeof c.budget.value === 'number' && c.budget.metric && c.budget.op,
    );
    expect(budgeted.length).toBeGreaterThanOrEqual(1);
  });

  it('acceptance: produces ≥3 criteria with ≥1 property/integration test_type', async () => {
    const { patch } = await mockDraft('acceptance', emptySpec);
    const acceptance = patch['acceptance'] as Array<{
      id: string;
      statement: string;
      test_type: string;
      status: string;
    }>;
    expect(acceptance.length).toBeGreaterThanOrEqual(3);
    expect(
      acceptance.some((a) => a.test_type === 'integration' || a.test_type === 'property'),
    ).toBe(true);
    for (const a of acceptance) {
      expect(a.id).toBeTruthy();
      expect(a.statement).toBeTruthy();
      expect(a.status).toBe('pending');
    }
  });
});
