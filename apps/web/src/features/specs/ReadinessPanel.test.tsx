import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReadinessPanel } from './ReadinessPanel.js';
import type { ReadinessBreakdown } from '@atlas/schema';

function make(overrides: Partial<ReadinessBreakdown> = {}): ReadinessBreakdown {
  return {
    weights: {
      acceptance_structure: 40,
      non_goals_present: 20,
      constraints_specific: 20,
      open_questions: 10,
      context_bundle: 10,
    },
    components: {
      acceptance_structure: { score: 40, max: 40, notes: ['3 criteria'] },
      non_goals_present: { score: 20, max: 20, notes: [] },
      constraints_specific: { score: 20, max: 20, notes: [] },
      open_questions: { score: 10, max: 10, notes: [] },
      context_bundle: { score: 5, max: 10, notes: [] },
    },
    threshold: 70,
    gated: false,
    computed_at: '2026-04-23T00:00:00Z',
    ...overrides,
  } as unknown as ReadinessBreakdown;
}

describe('<ReadinessPanel />', () => {
  it('sums the five component scores and renders total', () => {
    render(<ReadinessPanel breakdown={make()} />);
    // 40 + 20 + 20 + 10 + 5 = 95
    expect(screen.getByTestId('readiness-score').textContent).toBe('95');
    expect(screen.getByTestId('gate-pill').getAttribute('data-gated')).toBe('false');
  });

  it('shows the gated pill when gated', () => {
    render(
      <ReadinessPanel
        breakdown={make({
          gated: true,
          components: {
            acceptance_structure: { score: 0, max: 40, notes: [] },
            non_goals_present: { score: 0, max: 20, notes: [] },
            constraints_specific: { score: 0, max: 20, notes: [] },
            open_questions: { score: 10, max: 10, notes: [] },
            context_bundle: { score: 0, max: 10, notes: [] },
          } as unknown as ReadinessBreakdown['components'],
        })}
      />,
    );
    expect(screen.getByTestId('gate-pill').getAttribute('data-gated')).toBe('true');
    expect(screen.getByTestId('readiness-score').textContent).toBe('10');
  });
});
