import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { HelpDrawer } from './HelpDrawer.js';
import { HELP_SECTIONS } from './index.js';
import { useHelp } from './store.js';

describe('<HelpDrawer />', () => {
  it('renders closed by default with all section buttons', () => {
    act(() => useHelp.setState({ isOpen: false, sectionId: 'welcome' }));
    render(<HelpDrawer />);
    expect(screen.getByTestId('help-drawer').getAttribute('data-open')).toBe('false');
    for (const s of HELP_SECTIONS) {
      expect(screen.getByTestId(`help-section-${s.id}`)).toBeInTheDocument();
    }
  });

  it('opens when store.open is called and switches section on click', () => {
    act(() => useHelp.setState({ isOpen: false, sectionId: 'welcome' }));
    render(<HelpDrawer />);
    act(() => useHelp.getState().open('reading-work-graph'));
    expect(screen.getByTestId('help-drawer').getAttribute('data-open')).toBe('true');
    expect(screen.getByTestId('help-article').getAttribute('data-section')).toBe(
      'reading-work-graph',
    );

    fireEvent.click(screen.getByTestId('help-section-concepts'));
    expect(screen.getByTestId('help-article').getAttribute('data-section')).toBe('concepts');
  });

  it('close button dismisses the drawer', () => {
    act(() => useHelp.setState({ isOpen: true, sectionId: 'welcome' }));
    render(<HelpDrawer />);
    fireEvent.click(screen.getByTestId('help-close'));
    expect(screen.getByTestId('help-drawer').getAttribute('data-open')).toBe('false');
  });

  it('renders rendered HTML into the article (markdown compiled)', () => {
    act(() => useHelp.setState({ isOpen: true, sectionId: 'welcome' }));
    render(<HelpDrawer />);
    const article = screen.getByTestId('help-article');
    // The Welcome section h1 is "Welcome to Atlas".
    expect(article.innerHTML).toContain('<h1>Welcome to Atlas</h1>');
  });
});
