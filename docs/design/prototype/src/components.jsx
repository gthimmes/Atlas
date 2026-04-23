/* Atlas — shared UI primitives. Exported to window. */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ---------- Icons (small, inline) ----------
const Icon = ({ name, size = 14, stroke = 1.6 }) => {
  const s = size;
  const common = { width: s, height: s, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    graph: <><circle cx="3" cy="8" r="1.6"/><circle cx="13" cy="4" r="1.6"/><circle cx="13" cy="12" r="1.6"/><path d="M4.4 7.2l7.2-2.4M4.4 8.8l7.2 2.4"/></>,
    spec: <><path d="M4 2h6l2 2v10H4z"/><path d="M6 6h4M6 8.5h4M6 11h2.5"/></>,
    pitch: <><path d="M3 3h10v8l-2-1.5L8 11l-3-1.5L3 11z"/></>,
    agent: <><circle cx="8" cy="6" r="2.5"/><path d="M3.5 13c.5-2.2 2.3-3.5 4.5-3.5s4 1.3 4.5 3.5"/><circle cx="12.5" cy="3.5" r="0.8" fill="currentColor"/></>,
    digest: <><path d="M3 4h10M3 8h10M3 12h6"/></>,
    decision: <><path d="M8 2v12M3 5l5-3 5 3M3 11l5 3 5-3"/></>,
    settings: <><circle cx="8" cy="8" r="2"/><path d="M8 1.5v2M8 12.5v2M14.5 8h-2M3.5 8h-2M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4M12.6 12.6l-1.4-1.4M4.8 4.8L3.4 3.4"/></>,
    search: <><circle cx="7" cy="7" r="4"/><path d="M10 10l3 3"/></>,
    check: <><path d="M3 8.5l3 3 7-7"/></>,
    x: <><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></>,
    plus: <><path d="M8 3v10M3 8h10"/></>,
    chevRight: <><path d="M6 3l5 5-5 5"/></>,
    chevDown: <><path d="M3 6l5 5 5-5"/></>,
    play: <><path d="M5 3l8 5-8 5z" fill="currentColor" stroke="none"/></>,
    pause: <><path d="M5 3v10M11 3v10"/></>,
    stop: <><rect x="4" y="4" width="8" height="8"/></>,
    human: <><circle cx="8" cy="5" r="2.5"/><path d="M3 13c.6-2.5 2.7-4 5-4s4.4 1.5 5 4"/></>,
    bolt: <><path d="M9 1L3 9h4l-1 6 6-8H8z"/></>,
    link: <><path d="M6.5 9.5l-2 2a2.5 2.5 0 01-3.5-3.5l2-2M9.5 6.5l2-2a2.5 2.5 0 013.5 3.5l-2 2M5.5 10.5l5-5"/></>,
    git: <><circle cx="4" cy="3.5" r="1.5"/><circle cx="4" cy="12.5" r="1.5"/><circle cx="12" cy="8" r="1.5"/><path d="M4 5v6M5.5 12.5h2.5a2 2 0 002-2V9.5"/></>,
    flask: <><path d="M6 2h4M6.5 2v4L3 12a1.5 1.5 0 001.3 2.3h7.4A1.5 1.5 0 0013 12L9.5 6V2"/></>,
    lock: <><rect x="3.5" y="7" width="9" height="6.5" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></>,
    arrow: <><path d="M3 8h10M9 4l4 4-4 4"/></>,
    dot: <><circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none"/></>,
    clock: <><circle cx="8" cy="8" r="5.5"/><path d="M8 5v3l2 1.5"/></>,
    sparkle: <><path d="M8 2l1.2 3.8L13 7l-3.8 1.2L8 12l-1.2-3.8L3 7l3.8-1.2zM13 11l.6 1.4L15 13l-1.4.6L13 15l-.6-1.4L11 13l1.4-.6z"/></>,
    graphNode: <><circle cx="8" cy="8" r="3"/></>,
    minus: <><path d="M3 8h10"/></>,
    filter: <><path d="M2.5 3.5h11l-4 5v4l-3-1.5v-2.5z"/></>,
    menu: <><path d="M2 4h12M2 8h12M2 12h12"/></>,
    sun: <><circle cx="8" cy="8" r="3"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M13 3l-1 1M4 12l-1 1"/></>,
    moon: <><path d="M13 9.5A5.5 5.5 0 016.5 3 5.5 5.5 0 108 14a5.5 5.5 0 005-4.5z"/></>,
  };
  return <svg {...common}>{paths[name] || null}</svg>;
};

// ---------- Chip (status pill) ----------
const Chip = ({ status = 'default', children, mono, size = 'md', onClick, dot = true, sparkline, icon, style }) => {
  const colorMap = {
    passing: 'var(--signal-green)',
    failing: 'var(--signal-red)',
    flaky: 'var(--signal-amber)',
    generated: 'var(--accent-mixed)',
    unverified: 'var(--fg-3)',
    human: 'var(--accent-human)',
    agent: 'var(--accent-agent)',
    mixed: 'var(--accent-mixed)',
    risk_green: 'var(--signal-green)',
    risk_amber: 'var(--signal-amber)',
    risk_red: 'var(--signal-red)',
    L0: 'var(--fg-3)',
    L1: 'var(--accent-human)',
    L2: 'var(--accent-agent)',
    default: 'var(--fg-2)',
    active: 'var(--accent-human)',
  };
  const c = colorMap[status] || colorMap.default;
  const pad = size === 'sm' ? '1px 6px' : '2px 8px';
  return (
    <span
      onClick={onClick}
      className={mono ? 'mono' : ''}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: pad,
        fontSize: size === 'sm' ? 10 : 11,
        fontWeight: 500,
        lineHeight: 1.2,
        color: 'var(--fg-1)',
        background: 'var(--chip-bg)',
        border: '1px solid var(--chip-border)',
        borderRadius: 'var(--r-pill)',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        letterSpacing: mono ? 0 : 0.1,
        ...style,
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: c, flexShrink: 0 }}/>}
      {icon && <Icon name={icon} size={10}/>}
      {children}
      {sparkline && <Sparkline data={sparkline} color={c} />}
    </span>
  );
};

// ---------- Sparkline (flakiness mini-chart) ----------
const Sparkline = ({ data = [], color = 'var(--fg-2)', width = 28, height = 8 }) => {
  if (!data.length) return null;
  const step = width / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => `${i * step},${height - v * height}`).join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1" opacity="0.8"/>
    </svg>
  );
};

// ---------- Button ----------
const Button = ({ variant = 'ghost', size = 'md', children, onClick, icon, trailing, disabled, style, kbd, active, title }) => {
  const sizes = {
    sm: { pad: '3px 8px', fs: 11 },
    md: { pad: '5px 10px', fs: 12 },
    lg: { pad: '8px 14px', fs: 13 },
  };
  const variants = {
    primary: {
      background: 'var(--fg-0)',
      color: 'var(--bg-0)',
      border: '1px solid var(--fg-0)',
    },
    accent: {
      background: 'var(--accent-human)',
      color: 'var(--bg-0)',
      border: '1px solid var(--accent-human)',
    },
    secondary: {
      background: 'var(--bg-2)',
      color: 'var(--fg-0)',
      border: '1px solid var(--line-2)',
    },
    ghost: {
      background: active ? 'var(--bg-3)' : 'transparent',
      color: 'var(--fg-1)',
      border: '1px solid transparent',
    },
    outline: {
      background: 'transparent',
      color: 'var(--fg-1)',
      border: '1px solid var(--line-2)',
    },
    danger: {
      background: 'transparent',
      color: 'var(--signal-red)',
      border: '1px solid var(--line-2)',
    },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: sizes[size].pad,
        fontSize: sizes[size].fs,
        fontWeight: 500,
        lineHeight: 1.2,
        borderRadius: 'var(--r-2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease)',
        whiteSpace: 'nowrap',
        ...variants[variant],
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (variant === 'ghost') e.currentTarget.style.background = 'var(--bg-3)';
        if (variant === 'outline' || variant === 'secondary' || variant === 'danger') e.currentTarget.style.borderColor = 'var(--line-strong)';
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        if (variant === 'ghost') e.currentTarget.style.background = active ? 'var(--bg-3)' : 'transparent';
        if (variant === 'outline' || variant === 'secondary' || variant === 'danger') e.currentTarget.style.borderColor = 'var(--line-2)';
      }}
    >
      {icon && <Icon name={icon} size={12}/>}
      {children}
      {trailing && <Icon name={trailing} size={12}/>}
      {kbd && <Kbd>{kbd}</Kbd>}
    </button>
  );
};

// ---------- Kbd ----------
const Kbd = ({ children, style }) => (
  <span className="mono" style={{
    fontSize: 10,
    padding: '1px 5px',
    background: 'var(--bg-inset)',
    border: '1px solid var(--line-2)',
    borderBottomWidth: 2,
    borderRadius: 'var(--r-1)',
    color: 'var(--fg-2)',
    lineHeight: 1,
    ...style,
  }}>{children}</span>
);

// ---------- Input ----------
const Input = ({ value, onChange, placeholder, icon, style, mono, onKeyDown }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '4px 8px',
    background: 'var(--bg-2)',
    border: '1px solid var(--line-1)',
    borderRadius: 'var(--r-2)',
    ...style,
  }}>
    {icon && <span style={{ color: 'var(--fg-3)', display: 'flex' }}><Icon name={icon} size={12}/></span>}
    <input
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={mono ? 'mono' : ''}
      style={{
        flex: 1, background: 'transparent', border: 'none', outline: 'none',
        color: 'var(--fg-0)', fontSize: 12, minWidth: 0,
      }}
    />
  </div>
);

// ---------- Card / Panel ----------
const Panel = ({ title, subtitle, actions, children, style, flush, noPad }) => (
  <div style={{
    background: 'var(--bg-1)',
    border: '1px solid var(--line-1)',
    borderRadius: 'var(--r-3)',
    overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    ...style,
  }}>
    {(title || actions) && (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: flush ? 'none' : '1px solid var(--line-1)',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          {title && <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-0)', letterSpacing: 0.1 }}>{title}</div>}
          {subtitle && <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{subtitle}</div>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 4 }}>{actions}</div>}
      </div>
    )}
    <div style={{ flex: 1, minHeight: 0, padding: noPad ? 0 : 12 }}>{children}</div>
  </div>
);

// ---------- Tabs ----------
const Tabs = ({ tabs, active, onChange, style }) => (
  <div style={{
    display: 'flex', gap: 0, borderBottom: '1px solid var(--line-1)',
    ...style,
  }}>
    {tabs.map(t => (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        style={{
          padding: '8px 12px',
          fontSize: 12, fontWeight: 500,
          background: 'transparent',
          color: active === t.id ? 'var(--fg-0)' : 'var(--fg-2)',
          border: 'none',
          borderBottom: `2px solid ${active === t.id ? 'var(--fg-0)' : 'transparent'}`,
          marginBottom: -1,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
        {t.icon && <Icon name={t.icon} size={12}/>}
        {t.label}
        {t.count != null && <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{t.count}</span>}
      </button>
    ))}
  </div>
);

// ---------- Avatar (human or agent) ----------
const Avatar = ({ name, kind = 'human', size = 20, style }) => {
  const initials = name.split(/[\s-]+/).slice(0, 2).map(s => s[0]).join('').toUpperCase();
  const bg = kind === 'agent' ? 'var(--accent-agent)' : 'var(--accent-human)';
  const borderShape = kind === 'agent' ? '2px' : '999px';
  return (
    <div
      title={name}
      style={{
        width: size, height: size,
        background: bg,
        color: 'var(--bg-0)',
        borderRadius: borderShape,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.42, fontWeight: 600,
        flexShrink: 0,
        fontFamily: kind === 'agent' ? 'var(--font-mono)' : 'var(--font-sans)',
        ...style,
      }}
    >
      {initials}
    </div>
  );
};

// ---------- Segmented control ----------
const Segmented = ({ options, value, onChange, style }) => (
  <div style={{
    display: 'inline-flex',
    background: 'var(--bg-inset)',
    border: '1px solid var(--line-1)',
    borderRadius: 'var(--r-2)',
    padding: 2,
    gap: 0,
    ...style,
  }}>
    {options.map(o => (
      <button key={o.value} onClick={() => onChange(o.value)} style={{
        padding: '3px 10px',
        fontSize: 11, fontWeight: 500,
        background: value === o.value ? 'var(--bg-2)' : 'transparent',
        color: value === o.value ? 'var(--fg-0)' : 'var(--fg-2)',
        border: 'none',
        borderRadius: 'var(--r-1)',
        cursor: 'pointer',
        boxShadow: value === o.value ? 'var(--shadow-1)' : 'none',
        display: 'inline-flex', alignItems: 'center', gap: 5,
      }}>
        {o.icon && <Icon name={o.icon} size={11}/>}
        {o.label}
      </button>
    ))}
  </div>
);

// ---------- Progress bar ----------
const ProgressBar = ({ value, max = 100, color = 'var(--accent-human)', height = 4, showLabel }) => {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height, background: 'var(--bg-inset)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 400ms var(--ease)' }}/>
      </div>
      {showLabel && <span className="mono" style={{ fontSize: 10, color: 'var(--fg-2)' }}>{Math.round(pct)}%</span>}
    </div>
  );
};

// ---------- Divider ----------
const Divider = ({ vertical, style }) => (
  <div style={{
    background: 'var(--line-1)',
    ...(vertical ? { width: 1, alignSelf: 'stretch' } : { height: 1, width: '100%' }),
    ...style,
  }}/>
);

Object.assign(window, {
  Icon, Chip, Sparkline, Button, Kbd, Input, Panel, Tabs, Avatar, Segmented, ProgressBar, Divider,
});
