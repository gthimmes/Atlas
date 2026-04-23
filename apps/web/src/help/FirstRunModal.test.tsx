import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FirstRunModal } from './FirstRunModal.js';
import { useHelp } from './store.js';

describe('<FirstRunModal />', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('renders when firstRunSeen is not set', () => {
    render(<FirstRunModal />);
    expect(screen.getByTestId('first-run-modal')).toBeInTheDocument();
  });

  it('is hidden once firstRunSeen is true', () => {
    localStorage.setItem('atlas.firstRunSeen', 'true');
    const { queryByTestId } = render(<FirstRunModal />);
    expect(queryByTestId('first-run-modal')).toBeNull();
  });

  it('dismiss persists the flag and closes', () => {
    render(<FirstRunModal />);
    fireEvent.click(screen.getByTestId('first-run-dismiss'));
    expect(localStorage.getItem('atlas.firstRunSeen')).toBe('true');
    expect(screen.queryByTestId('first-run-modal')).toBeNull();
  });

  it('show-around persists the flag AND opens the help drawer', () => {
    useHelp.setState({ isOpen: false, sectionId: 'welcome' });
    render(<FirstRunModal />);
    fireEvent.click(screen.getByTestId('first-run-show-around'));
    expect(localStorage.getItem('atlas.firstRunSeen')).toBe('true');
    expect(useHelp.getState().isOpen).toBe(true);
    expect(useHelp.getState().sectionId).toBe('reading-work-graph');
  });
});
