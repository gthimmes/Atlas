import { useEffect, useState } from 'react';
import { useHelp } from './store.js';

const STORAGE_KEY = 'atlas.firstRunSeen';

export function FirstRunModal() {
  const [visible, setVisible] = useState(false);
  const openHelp = useHelp((s) => s.open);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== 'true') {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };
  const showAround = () => {
    dismiss();
    openHelp('reading-work-graph');
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="welcome to atlas"
      data-testid="first-run-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'var(--scrim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: '92vw',
          background: 'var(--bg-1)',
          border: '1px solid var(--line-2)',
          borderRadius: 'var(--r-3)',
          padding: 'var(--s-6)',
          boxShadow: 'var(--shadow-2)',
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 'var(--fs-11)',
            color: 'var(--fg-3)',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            marginBottom: 'var(--s-2)',
          }}
        >
          Welcome to Atlas
        </div>
        <h1 style={{ margin: 0, fontSize: 'var(--fs-24)', fontWeight: 600, color: 'var(--fg-0)' }}>
          This is not a ticket tracker.
        </h1>
        <p
          style={{
            marginTop: 'var(--s-3)',
            marginBottom: 'var(--s-5)',
            color: 'var(--fg-1)',
            lineHeight: 'var(--lh-prose)',
          }}
        >
          Atlas replaces the ticket with a structured <strong>spec</strong>. Specs have acceptance
          criteria with live test statuses, a readiness score that gates task spawning, and (from
          Phase 3) agents that work on tasks on your behalf.
        </p>

        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '0 0 var(--s-5)',
            color: 'var(--fg-1)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--s-3)',
          }}
        >
          <li style={{ display: 'flex', gap: 'var(--s-3)' }}>
            <span style={{ color: 'var(--accent-human)', fontWeight: 600 }}>1</span>
            <span>
              The big tile on the left is the seeded spec. The chips on the right are its tasks.
            </span>
          </li>
          <li style={{ display: 'flex', gap: 'var(--s-3)' }}>
            <span style={{ color: 'var(--accent-human)', fontWeight: 600 }}>2</span>
            <span>
              Click a spec to open the editor. Click a task to see its details. Press{' '}
              <kbd style={kbdStyle}>G</kbd> / <kbd style={kbdStyle}>S</kbd> to switch surfaces.
            </span>
          </li>
          <li style={{ display: 'flex', gap: 'var(--s-3)' }}>
            <span style={{ color: 'var(--accent-human)', fontWeight: 600 }}>3</span>
            <span>
              Hit <kbd style={kbdStyle}>?</kbd> anytime to reopen help. The "reset welcome" link in
              the footer brings this modal back.
            </span>
          </li>
        </ul>

        <div style={{ display: 'flex', gap: 'var(--s-2)', justifyContent: 'flex-end' }}>
          <button data-testid="first-run-dismiss" onClick={dismiss} style={btnSecondary}>
            I'll figure it out
          </button>
          <button data-testid="first-run-show-around" onClick={showAround} style={btnPrimary}>
            Show me around
          </button>
        </div>
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  padding: '1px 5px',
  background: 'var(--bg-2)',
  border: '1px solid var(--line-1)',
  borderRadius: 'var(--r-1)',
  color: 'var(--fg-1)',
};

const btnPrimary: React.CSSProperties = {
  padding: '6px 14px',
  background: 'var(--accent-human)',
  color: 'var(--bg-0)',
  border: 'none',
  borderRadius: 'var(--r-2)',
  fontSize: 'var(--fs-12)',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '6px 14px',
  background: 'var(--bg-2)',
  color: 'var(--fg-1)',
  border: '1px solid var(--line-2)',
  borderRadius: 'var(--r-2)',
  fontSize: 'var(--fs-12)',
  cursor: 'pointer',
};
