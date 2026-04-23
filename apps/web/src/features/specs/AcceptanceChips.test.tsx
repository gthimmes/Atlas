import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AcceptanceChips } from './AcceptanceChips.js';
import type { AcceptanceCriterion } from '@atlas/schema';

function crit(id: string, status: AcceptanceCriterion['status']): AcceptanceCriterion {
  return {
    id: `ac_${id}` as AcceptanceCriterion['id'],
    spec: 'spec_test' as AcceptanceCriterion['spec'],
    statement: `criterion ${id}`,
    test_type: 'property',
    test_ref: null,
    status,
    flakiness_score: 0,
    last_run_at: null,
    run_history: [],
    owner: 'usr_test' as AcceptanceCriterion['owner'],
    proposed_by: 'usr_test' as AcceptanceCriterion['proposed_by'],
    accepted: true,
    created_at: '2026-04-23T00:00:00Z',
  };
}

describe('<AcceptanceChips />', () => {
  it('renders each criterion with its status attribute', () => {
    render(
      <AcceptanceChips
        criteria={[
          crit('1', 'passing'),
          crit('2', 'flaky'),
          crit('3', 'failing'),
          crit('4', 'generated'),
          crit('5', 'unverified'),
        ]}
      />,
    );
    expect(screen.getByTestId('acceptance-ac_1')).toBeInTheDocument();
    expect(
      screen.getByTestId('acceptance-ac_1').querySelector('[data-status="passing"]'),
    ).not.toBeNull();
    expect(
      screen.getByTestId('acceptance-ac_2').querySelector('[data-status="flaky"]'),
    ).not.toBeNull();
    expect(
      screen.getByTestId('acceptance-ac_3').querySelector('[data-status="failing"]'),
    ).not.toBeNull();
  });

  it('shows empty state when there are no criteria', () => {
    render(<AcceptanceChips criteria={[]} />);
    expect(screen.getByText(/No acceptance criteria/)).toBeInTheDocument();
  });
});
