import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { App } from './App.js';

describe('<App />', () => {
  it('renders the nav + a default surface', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"status":"ok"}', { status: 200 })),
    );
    render(<App />);
    expect(screen.getByTestId('atlas-shell')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Work graph/i })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('toggles theme when the badge is clicked', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"status":"ok"}', { status: 200 })),
    );
    render(<App />);
    const shell = screen.getByTestId('atlas-shell');
    const initial = shell.className;
    fireEvent.click(screen.getByRole('button', { name: /toggle to/i }));
    expect(shell.className).not.toBe(initial);
    vi.unstubAllGlobals();
  });

  it('switches surface when a nav item is activated', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"status":"ok"}', { status: 200 })),
    );
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Spec\b/i }));
    expect(screen.getByTestId('surface-spec')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
