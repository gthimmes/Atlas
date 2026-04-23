import { useEffect, useRef, useState } from 'react';
import { useHelp } from './store.js';

interface Props {
  /** Short inline explanation shown inside the popover. */
  summary: string;
  /** Section id to deep-link into the drawer on "Read more". */
  section: string;
  /** Accessible label for the question-mark button. */
  label?: string;
}

// A zero-dependency "?" icon that pops a small tooltip on hover / click and
// deep-links to the help drawer. Intentionally unpolished — Phase 6 can
// swap in Floating UI if we need placement heuristics.

export function WhatsThis({ summary, section, label = 'What is this?' }: Props) {
  const [open, setOpen] = useState(false);
  const openHelp = useHelp((s) => s.open);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [open]);

  return (
    <span ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        aria-label={label}
        data-testid="whats-this-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        style={{
          width: 14,
          height: 14,
          padding: 0,
          borderRadius: '50%',
          background: 'var(--bg-3)',
          color: 'var(--fg-2)',
          border: '1px solid var(--line-2)',
          fontSize: 9,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          verticalAlign: 'middle',
          marginLeft: 4,
        }}
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          data-testid="whats-this-popover"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: 6,
            width: 240,
            padding: 'var(--s-3)',
            background: 'var(--bg-1)',
            color: 'var(--fg-1)',
            border: '1px solid var(--line-2)',
            borderRadius: 'var(--r-2)',
            boxShadow: 'var(--shadow-2)',
            fontSize: 'var(--fs-12)',
            lineHeight: 'var(--lh-normal)',
            fontWeight: 400,
            textTransform: 'none',
            letterSpacing: 0,
            zIndex: 50,
          }}
        >
          {summary}
          <div style={{ marginTop: 6 }}>
            <button
              type="button"
              onClick={() => {
                openHelp(section);
                setOpen(false);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-human)',
                padding: 0,
                fontSize: 'var(--fs-12)',
                cursor: 'pointer',
              }}
            >
              Read more →
            </button>
          </div>
        </span>
      )}
    </span>
  );
}
