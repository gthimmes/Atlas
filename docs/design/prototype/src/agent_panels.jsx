/* Atlas — Agent Run Panel + Agent Digest (supporting surfaces). */

const { useState: useStateAR, useEffect: useEffectAR } = React;

function AgentRunPanel({ sessionId = 'sess-3a9f' }) {
  const sess = window.SESSIONS.find(s => s.id === sessionId) || window.SESSIONS[0];
  const agent = window.AGENTS.find(a => a.id === sess.agent);
  const task = window.TASKS.find(t => t.id === sess.task);
  const spec = task ? window.SPECS.find(s => s.id === task.spec) : null;
  const ctxPct = Math.round((sess.contextUsed / sess.contextMax) * 100);
  const [filter, setFilter] = useStateAR('all');

  const filters = [
    { id: 'all', label: 'All', count: sess.activities.length },
    { id: 'read', label: 'Reads' },
    { id: 'edit', label: 'Edits' },
    { id: 'tool', label: 'Tools' },
    { id: 'reason', label: 'Reasoning' },
    { id: 'decision', label: 'Decisions' },
  ];

  const filtered = sess.activities.filter(a => filter === 'all' || a.kind === filter);
  const elicit = sess.activities.find(a => a.kind === 'elicit');

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg-0)' }}>
      {/* Left: task/spec context */}
      <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--line-1)', background: 'var(--bg-1)', overflowY: 'auto' }}>
        <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid var(--line-1)' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-3)', letterSpacing: 0.8, marginBottom: 6 }}>WORKING ON</div>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 4 }} className="mono">{task?.id}</div>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>{task?.title}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="spec" size={11}/>
            <span className="mono">{spec?.id}</span>
            <span>{spec?.title}</span>
          </div>
        </div>

        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-1)' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-3)', letterSpacing: 0.8, marginBottom: 8 }}>CONTEXT BUNDLE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <MiniKV label="files" value={47}/>
            <MiniKV label="ADRs" value={6}/>
            <MiniKV label="skills" value={3}/>
            <MiniKV label="MCP" value={4}/>
          </div>
          <Button variant="ghost" size="sm" icon="spec" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>What agent sees</Button>
        </div>

        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-1)' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-3)', letterSpacing: 0.8, marginBottom: 8 }}>SKILLS</div>
          {['test-first', 'payments-style-guide', 'no-pii-in-logs'].map(s => (
            <div key={s} className="mono" style={{ fontSize: 11, padding: '2px 0', color: 'var(--fg-1)' }}>@skill/{s}</div>
          ))}
        </div>

        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-3)', letterSpacing: 0.8, marginBottom: 8 }}>ACCOUNTABLE</div>
          {(() => {
            const h = window.HUMANS.find(h => h.id === task?.assignee);
            return h ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar name={h.name} kind="human" size={22}/>
                <div>
                  <div style={{ fontSize: 12 }}>{h.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-3)' }}>{h.role}</div>
                </div>
              </div>
            ) : null;
          })()}
        </div>
      </div>

      {/* Center: activity timeline */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top strip: controls */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line-1)', background: 'var(--bg-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={agent.name} kind="agent" size={24}/>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{agent.name}</span>
                <Chip status="passing" size="sm">
                  <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--signal-green)', animation: 'pulse 1.2s infinite' }}/>
                  active
                </Chip>
                <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{agent.model}</span>
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 2 }}>session {sess.id}</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <Button variant="ghost" size="sm" icon="pause">Pause</Button>
              <Button variant="outline" size="sm" icon="stop">Stop</Button>
            </div>
          </div>

          {/* Telemetry row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 12 }}>
            <TelemetryBox label="elapsed" value={sess.elapsed}/>
            <TelemetryBox label="cost" value={`$${sess.cost.toFixed(2)}`} sub="ACU $1.42"/>
            <TelemetryBox label="context" value={`${ctxPct}%`} sub={`${Math.round(sess.contextUsed/1000)}k / ${Math.round(sess.contextMax/1000)}k`}
              progress={{ value: sess.contextUsed, max: sess.contextMax, color: ctxPct > 80 ? 'var(--signal-amber)' : 'var(--accent-agent)' }}/>
            <TelemetryBox label="sub-agents" value="0"/>
          </div>
        </div>

        {/* Elicitation banner */}
        {elicit && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 16px',
            background: 'oklch(from var(--signal-amber) l c h / 0.1)',
            borderBottom: '1px solid var(--signal-amber)',
          }}>
            <span style={{ color: 'var(--signal-amber)', paddingTop: 1 }}><Icon name="sparkle" size={14}/></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--signal-amber)', marginBottom: 3 }}>AGENT AWAITING INPUT</div>
              <div style={{ fontSize: 13, color: 'var(--fg-0)' }}>{elicit.text}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button variant="ghost" size="sm">Skip</Button>
              <Button variant="accent" size="sm">Answer</Button>
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 4, padding: '8px 16px', borderBottom: '1px solid var(--line-1)' }}>
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="mono"
              style={{
                padding: '3px 8px', fontSize: 10, fontWeight: 500,
                background: filter === f.id ? 'var(--bg-3)' : 'transparent',
                color: filter === f.id ? 'var(--fg-0)' : 'var(--fg-2)',
                border: 'none', borderRadius: 'var(--r-1)', cursor: 'pointer',
              }}>
              {f.label}{f.count != null ? ` (${f.count})` : ''}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {filtered.map((a, i) => (
            <TimelineEntry key={i} activity={a}/>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', fontSize: 11, color: 'var(--fg-3)' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--signal-green)', animation: 'pulse 1.2s infinite' }}/>
            <span className="mono">streaming…</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TelemetryBox({ label, value, sub, progress }) {
  return (
    <div style={{
      padding: '8px 10px',
      background: 'var(--bg-2)',
      border: '1px solid var(--line-1)',
      borderRadius: 'var(--r-2)',
    }}>
      <div style={{ fontSize: 10, color: 'var(--fg-3)', marginBottom: 3 }}>{label}</div>
      <div className="mono" style={{ fontSize: 15, fontWeight: 500, color: 'var(--fg-0)' }}>{value}</div>
      {sub && <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 2 }}>{sub}</div>}
      {progress && <div style={{ marginTop: 5 }}><ProgressBar value={progress.value} max={progress.max} height={2} color={progress.color}/></div>}
    </div>
  );
}

function TimelineEntry({ activity }) {
  const kindMap = {
    read:     { icon: 'spec', color: 'var(--fg-2)', label: 'read' },
    edit:     { icon: 'bolt', color: 'var(--accent-agent)', label: 'edit' },
    tool:     { icon: 'flask', color: 'var(--fg-2)', label: 'tool' },
    reason:   { icon: 'sparkle', color: 'var(--accent-mixed)', label: 'reason' },
    decision: { icon: 'decision', color: 'var(--accent-human)', label: 'decision' },
    elicit:   { icon: 'sparkle', color: 'var(--signal-amber)', label: 'elicit' },
  };
  const m = kindMap[activity.kind] || kindMap.read;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '6px 16px',
      borderLeft: `2px solid transparent`,
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-2)'}
    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', width: 40, flexShrink: 0, paddingTop: 3 }}>{activity.t}</span>
      <span className="mono" style={{ fontSize: 10, color: m.color, width: 56, flexShrink: 0, paddingTop: 3, textAlign: 'left' }}>{m.label}</span>
      <span style={{ color: m.color, flexShrink: 0, paddingTop: 2 }}><Icon name={m.icon} size={12}/></span>
      <span className={activity.kind === 'reason' ? '' : 'mono'} style={{
        fontSize: activity.kind === 'reason' ? 12 : 11,
        color: 'var(--fg-0)',
        lineHeight: 1.5,
        fontStyle: activity.kind === 'reason' ? 'italic' : 'normal',
        flex: 1,
      }}>{activity.text}</span>
    </div>
  );
}

const MiniKV = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 10, color: 'var(--fg-3)', marginBottom: 1 }}>{label}</div>
    <div className="mono" style={{ fontSize: 13, color: 'var(--fg-0)', fontWeight: 500 }}>{value}</div>
  </div>
);

// ---------------- Agent Digest ----------------

function AgentDigest() {
  const digest = window.DIGEST;
  const [selected, setSelected] = useStateAR(0);
  const [handled, setHandled] = useStateAR({});

  const onKey = (e) => {
    if (e.key === 'j' || e.key === 'ArrowDown') { setSelected(s => Math.min(digest.length - 1, s + 1)); e.preventDefault(); }
    if (e.key === 'k' || e.key === 'ArrowUp')   { setSelected(s => Math.max(0, s - 1)); e.preventDefault(); }
    if (e.key === 'a') { setHandled(h => ({ ...h, [digest[selected].id]: 'approved' })); setSelected(s => Math.min(digest.length - 1, s + 1)); }
    if (e.key === 'r') { setHandled(h => ({ ...h, [digest[selected].id]: 'changes' })); }
    if (e.key === 'e') { setHandled(h => ({ ...h, [digest[selected].id]: 'escalated' })); }
  };

  useEffectAR(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, digest]);

  const item = digest[selected];
  const task = window.TASKS.find(t => t.id === item.task);
  const agent = window.AGENTS.find(a => a.id === item.agent);

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg-0)' }}>
      {/* Left: digest list */}
      <div style={{ width: 360, flexShrink: 0, borderRight: '1px solid var(--line-1)', background: 'var(--bg-1)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--line-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Morning digest</h2>
            <Chip status="active" size="sm">{digest.length} new</Chip>
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>overnight · 4 sessions · 2 auto-merged · 2 need review</div>
        </div>

        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--line-1)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--fg-3)' }}>
          <Kbd>J</Kbd><Kbd>K</Kbd><span>nav</span>
          <span style={{ width: 6 }}/>
          <Kbd>A</Kbd><span>approve</span>
          <span style={{ width: 6 }}/>
          <Kbd>R</Kbd><span>request changes</span>
          <span style={{ width: 6 }}/>
          <Kbd>E</Kbd><span>escalate</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {digest.map((d, i) => {
            const t = window.TASKS.find(x => x.id === d.task);
            const ag = window.AGENTS.find(x => x.id === d.agent);
            const passing = d.passed === d.total;
            const riskColor = { red: 'var(--signal-red)', amber: 'var(--signal-amber)', green: 'var(--signal-green)' }[d.risk];
            return (
              <div key={d.id} onClick={() => setSelected(i)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--line-1)',
                  borderLeft: `3px solid ${selected === i ? 'var(--accent-human)' : 'transparent'}`,
                  background: selected === i ? 'var(--bg-2)' : 'transparent',
                  cursor: 'pointer',
                  opacity: handled[d.id] ? 0.5 : 1,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Avatar name={ag.name} kind="agent" size={16}/>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--fg-2)' }}>{ag.name}</span>
                  <span style={{ flex: 1 }}/>
                  <Chip status={d.trust === 'L1' ? 'L1' : 'L0'} size="sm">{d.trust}</Chip>
                  {d.merged && <Chip status="passing" size="sm">merged</Chip>}
                  {d.sample && <Chip status="flaky" size="sm">sampled</Chip>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--fg-0)' }}>{d.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                  <span className="mono" style={{ color: 'var(--fg-3)' }}>{d.task}</span>
                  <span style={{ width: 4, height: 4, borderRadius: 999, background: riskColor }}/>
                  <span className="mono" style={{ color: 'var(--fg-2)' }}>{d.passed}/{d.total} chips</span>
                  <span style={{ flex: 1 }}/>
                  {handled[d.id] === 'approved' && <Chip status="passing" size="sm" icon="check">approved</Chip>}
                  {handled[d.id] === 'changes' && <Chip status="flaky" size="sm">changes req</Chip>}
                  {handled[d.id] === 'escalated' && <Chip status="failing" size="sm">escalated</Chip>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: detail */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid var(--line-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{item.task}</span>
            <Chip status={`risk_${item.risk}`} size="sm">risk {item.risk}</Chip>
            <Chip status={item.trust === 'L1' ? 'L1' : 'L0'} size="sm">trust {item.trust}</Chip>
            {item.merged && <Chip status="passing" size="sm">auto-merged</Chip>}
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 600, letterSpacing: -0.2 }}>{item.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--fg-2)' }}>
            <Avatar name={agent.name} kind="agent" size={16}/>
            <span className="mono">{agent.name}</span>
            <span style={{ color: 'var(--fg-3)' }}>·</span>
            <span className="mono">{agent.model}</span>
          </div>
        </div>

        {/* Paths warning (if high-risk) */}
        {item.risk === 'red' && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 28px',
            background: 'oklch(from var(--signal-red) l c h / 0.08)',
            borderBottom: '1px solid var(--signal-red)',
          }}>
            <Icon name="lock" size={14}/>
            <div style={{ fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>Constitution clause c2 triggered:</span> changes under <span className="mono">billing/</span> and <span className="mono">migrations/</span> require human review regardless of tier.
            </div>
          </div>
        )}

        <div style={{ padding: '20px 28px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-3)', letterSpacing: 0.8, marginBottom: 10 }}>ACCEPTANCE CRITERIA</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            {Array.from({ length: item.total }).map((_, i) => (
              <Chip key={i} status={i < item.passed ? 'passing' : 'failing'} size="sm">
                {i < item.passed ? 'pass' : 'fail'} · ac{i+1}
              </Chip>
            ))}
          </div>

          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-3)', letterSpacing: 0.8, marginBottom: 10 }}>SYNTHETIC DIFF SUMMARY</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {item.summary.map((s, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10,
                padding: '10px 12px',
                background: 'var(--bg-1)',
                border: '1px solid var(--line-1)',
                borderLeft: `3px solid ${s.includes('Deviation') || s.includes('missing') || s.includes('failing') ? 'var(--signal-amber)' : 'var(--accent-agent)'}`,
                borderRadius: 'var(--r-2)',
                fontSize: 12, lineHeight: 1.5,
              }}>
                <span className="mono" style={{ color: 'var(--fg-3)', width: 20, flexShrink: 0 }}>{String(i+1).padStart(2, '0')}</span>
                <span>{s}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-3)', letterSpacing: 0.8, marginBottom: 10 }}>PATHS TOUCHED</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
            {item.paths.map(p => <span key={p} className="mono" style={{ fontSize: 11, padding: '2px 8px', background: 'var(--bg-inset)', border: '1px solid var(--line-1)', borderRadius: 3 }}>{p}</span>)}
          </div>

          {/* Action bar */}
          <div style={{
            position: 'sticky', bottom: 0,
            display: 'flex', gap: 8, padding: 14, marginTop: 20,
            background: 'var(--bg-1)',
            border: '1px solid var(--line-1)',
            borderRadius: 'var(--r-3)',
            boxShadow: 'var(--shadow-2)',
          }}>
            <Button variant="accent" size="lg" icon="check" kbd="A" onClick={() => { setHandled(h => ({ ...h, [item.id]: 'approved' })); setSelected(s => Math.min(digest.length - 1, s + 1)); }}>Approve</Button>
            <Button variant="outline" size="lg" kbd="R" onClick={() => setHandled(h => ({ ...h, [item.id]: 'changes' }))}>Request changes</Button>
            <Button variant="ghost" size="lg" kbd="E" onClick={() => setHandled(h => ({ ...h, [item.id]: 'escalated' }))}>Escalate to full review</Button>
            <div style={{ flex: 1 }}/>
            <Button variant="ghost" size="lg" icon="git">Open PR</Button>
            <Button variant="ghost" size="lg" icon="bolt">Open run</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AgentRunPanel, AgentDigest });
