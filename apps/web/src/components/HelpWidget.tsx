import { useEffect, useRef } from 'react';
import { HelpNavigator } from 'help-navigator';
import { helpContent } from '../help/content.js';
import { helpArticlesFor } from '../help/context.js';

interface Props {
  /** The shell's current view ('graph' | 'spec' | 'run' | 'digest'). */
  view: string;
  theme: 'dark' | 'light';
}

// Mounts the in-app help center (floating launcher bottom-right, F1 to
// toggle) and keeps "Suggested for this page" in sync with the shell's
// view. Complements the quick-reference drawer (`?`); does not replace it.
// The accent rides Atlas's own token so it tracks the theme palette.
export function HelpWidget({ view, theme }: Props) {
  const helpRef = useRef<HelpNavigator | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  // Re-init on theme change so the panel chrome matches the app theme.
  useEffect(() => {
    const help = HelpNavigator.init({
      content: helpContent,
      theme,
      accentColor: 'var(--accent-human)',
      position: 'bottom-right',
      hotkey: 'F1',
      texts: { panelTitle: 'Atlas help' },
      context: helpArticlesFor(viewRef.current),
    });
    helpRef.current = help;
    return () => {
      helpRef.current = null;
      help.destroy();
    };
  }, [theme]);

  useEffect(() => {
    helpRef.current?.setContext(helpArticlesFor(view));
  }, [view]);

  return null;
}
