import { useEffect } from 'react';
import { HELP_SECTIONS, getSection } from './index.js';
import { useHelp } from './store.js';
import './help.css';

export function HelpDrawer() {
  const { isOpen, sectionId, close, setSection } = useHelp();

  // Keyboard: Esc closes; 1-9 jumps to section while drawer is open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape') {
        close();
        return;
      }
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= HELP_SECTIONS.length) {
        setSection(HELP_SECTIONS[n - 1]!.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close, setSection]);

  const current = getSection(sectionId) ?? HELP_SECTIONS[0]!;

  return (
    <div
      aria-hidden={!isOpen}
      data-testid="help-drawer"
      data-open={isOpen}
      className="help-drawer-root"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        zIndex: 200,
      }}
    >
      <div
        onClick={close}
        style={{
          position: 'absolute',
          inset: 0,
          background: isOpen ? 'var(--scrim)' : 'transparent',
          opacity: isOpen ? 1 : 0,
          transition: `opacity var(--dur-med) var(--ease)`,
        }}
      />
      <aside
        role="dialog"
        aria-label="help"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          height: '100%',
          width: 'min(640px, 95vw)',
          background: 'var(--bg-1)',
          borderLeft: '1px solid var(--line-2)',
          boxShadow: 'var(--shadow-2)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: `transform var(--dur-med) var(--ease)`,
          display: 'grid',
          gridTemplateColumns: '180px 1fr',
        }}
      >
        <nav
          aria-label="help sections"
          style={{
            borderRight: '1px solid var(--line-1)',
            background: 'var(--bg-2)',
            display: 'flex',
            flexDirection: 'column',
            padding: 'var(--s-4) 0',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              padding: '0 var(--s-4) var(--s-3)',
              fontSize: 'var(--fs-11)',
              color: 'var(--fg-3)',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              fontWeight: 600,
            }}
          >
            Help
          </div>
          {HELP_SECTIONS.map((s, i) => (
            <button
              key={s.id}
              data-testid={`help-section-${s.id}`}
              data-active={s.id === sectionId}
              onClick={() => setSection(s.id)}
              style={{
                textAlign: 'left',
                padding: '6px var(--s-4)',
                background: s.id === sectionId ? 'var(--bg-3)' : 'transparent',
                color: s.id === sectionId ? 'var(--fg-0)' : 'var(--fg-1)',
                border: 'none',
                borderLeft: `2px solid ${s.id === sectionId ? 'var(--accent-human)' : 'transparent'}`,
                cursor: 'pointer',
                fontSize: 'var(--fs-12)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--s-2)',
              }}
            >
              <span
                className="mono"
                style={{
                  color: 'var(--fg-3)',
                  fontSize: 10,
                  width: 12,
                  textAlign: 'right',
                }}
              >
                {i + 1}
              </span>
              <span>{s.title}</span>
            </button>
          ))}
        </nav>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--s-3) var(--s-5)',
              borderBottom: '1px solid var(--line-1)',
            }}
          >
            <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>
              help · press ? to close
            </span>
            <button
              data-testid="help-close"
              aria-label="close help"
              onClick={close}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--fg-2)',
                fontSize: 18,
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </header>
          <article
            className="help-article"
            data-testid="help-article"
            data-section={sectionId}
            style={{
              padding: 'var(--s-5) var(--s-6)',
              overflowY: 'auto',
              color: 'var(--fg-1)',
              lineHeight: 'var(--lh-prose)',
            }}
            dangerouslySetInnerHTML={{ __html: current.body }}
          />
        </div>
      </aside>
    </div>
  );
}
