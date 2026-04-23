/* Atlas — Spec Editor (P0). Two-column: structured spec + live sidebar. */

const { useState: useStateSE, useMemo: useMemoSE } = React;

function SpecEditor({ specId = 'S-142', onOpenGraph }) {
  const spec = window.SPECS.find(s => s.id === specId) || window.SPECS[0];
  const [activeSection, setActiveSection] = useStateSE('acceptance');
  const [openAC, setOpenAC] = useStateSE(null);

  const owner = window.HUMANS.find(h => h.id === spec.owner);
  const tasks = window.TASKS.filter(t => t.spec === spec.id);
  const passing = (spec.acceptance || []).filter(a => a.status === 'passing').length;
  const total = (spec.acceptance || []).length;

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {/* Left: spec body */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-0)' }}>
        {/* Header */}
        <div style={{ padding: '20px 32px 16px', borderBottom: '1px solid var(--line-1)', background: 'var(--bg-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Icon name="spec" size={14}/>
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{spec.id}</span>
            <Chip status="human" size="sm">spec</Chip>
            <Chip status="active" size="sm">{spec.status}</Chip>
            <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>v12 · edited 4m ago</span>
            <div style={{ flex: 1 }}/>
            <Button variant="ghost" size="sm" icon="git">Diff</Button>
            <Button variant="ghost" size="sm" icon="link">Sync to repo</Button>
            <Button variant="secondary" size="sm" icon="arrow">Compile to Spec Kit</Button>
          </div>
          <h1 style={{
            fontSize: 24, fontWeight: 600, margin: '0 0 8px', letterSpacing: -0.3,
            color: 'var(--fg-0)',
          }}>{spec.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--fg-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Avatar name={owner?.name || '?'} kind="human" size={16}/>
              <span>{owner?.name}</span>
            </div>
            <span style={{ color: 'var(--fg-3)' }}>·</span>
            <span>Pitch <span className="mono" style={{ color: 'var(--fg-1)' }}>{spec.pitch}</span></span>
            <span style={{ color: 'var(--fg-3)' }}>·</span>
            <span>{tasks.length} tasks</span>
            <span style={{ color: 'var(--fg-3)' }}>·</span>
            <span className="mono">{passing}/{total} acceptance passing</span>
          </div>
        </div>

        {/* Section nav (sticky-ish) */}
        <div style={{
          display: 'flex', gap: 4, padding: '8px 32px',
          borderBottom: '1px solid var(--line-1)',
          background: 'var(--bg-1)', position: 'sticky', top: 0, zIndex: 5,
        }}>
          {['intent', 'non_goals', 'constraints', 'acceptance', 'decisions', 'open_questions'].map(s => (
            <button key={s}
              onClick={() => { setActiveSection(s); document.getElementById(`sec-${s}`)?.scrollIntoView({ block: 'start' }); }}
              style={{
                padding: '4px 10px', fontSize: 11, fontWeight: 500,
                background: activeSection === s ? 'var(--bg-3)' : 'transparent',
                color: activeSection === s ? 'var(--fg-0)' : 'var(--fg-2)',
                border: 'none', borderRadius: 'var(--r-2)', cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '24px 32px 80px', maxWidth: 820 }}>
          <Section id="sec-intent" label="intent" type="prose">
            <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--fg-0)', margin: 0 }}>{spec.intent}</p>
          </Section>

          <Section id="sec-non_goals" label="non_goals" type="list" count={spec.nonGoals?.length}>
            {spec.nonGoals?.map((g, i) => (
              <ListRow key={i} bullet="×" color="var(--signal-red)">{g}</ListRow>
            ))}
          </Section>

          <Section id="sec-constraints" label="constraints" type="list" count={spec.constraints?.length}>
            {spec.constraints?.map((c, i) => (
              <ListRow key={i} bullet="≤" color="var(--accent-mixed)">{c}</ListRow>
            ))}
          </Section>

          <Section id="sec-acceptance" label="acceptance" type="criteria" count={`${passing}/${total}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {spec.acceptance?.map(ac => (
                <CriterionRow key={ac.id} ac={ac} open={openAC === ac.id} onToggle={() => setOpenAC(openAC === ac.id ? null : ac.id)}/>
              ))}
              <button style={{
                padding: '8px 10px',
                fontSize: 11, color: 'var(--fg-3)',
                background: 'transparent',
                border: '1px dashed var(--line-2)',
                borderRadius: 'var(--r-2)',
                cursor: 'pointer', textAlign: 'left',
                marginTop: 4,
              }}>
                + Add acceptance criterion
              </button>
            </div>
          </Section>

          <Section id="sec-decisions" label="decisions" type="list" count={spec.decisions?.length}>
            {spec.decisions?.map(d => (
              <div key={d.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px',
                border: '1px solid var(--line-1)',
                borderRadius: 'var(--r-2)',
                background: 'var(--bg-1)',
                marginBottom: 6,
              }}>
                <Icon name="decision" size={12}/>
                <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{d.id}</span>
                <span style={{ flex: 1, fontSize: 12 }}>{d.title}</span>
                <Chip status={d.by === 'agent' ? 'agent' : 'human'} size="sm">{d.by}</Chip>
                <Chip status="passing" size="sm">accepted</Chip>
              </div>
            ))}
          </Section>

          <Section id="sec-open_questions" label="open_questions" type="list" count={spec.openQuestions?.length}>
            {spec.openQuestions?.map(q => (
              <div key={q.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '8px 10px',
                border: '1px solid var(--signal-amber)',
                borderLeft: '3px solid var(--signal-amber)',
                borderRadius: 'var(--r-2)',
                background: 'oklch(from var(--signal-amber) l c h / 0.06)',
                marginBottom: 6,
              }}>
                <Icon name="sparkle" size={12}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, marginBottom: 3 }}>{q.text}</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-3)' }}>Blocks spawn · resolve to raise readiness</div>
                </div>
                <Button variant="ghost" size="sm">Resolve</Button>
              </div>
            ))}
          </Section>
        </div>
      </div>

      {/* Right: sidebar */}
      <div style={{
        width: 340, flexShrink: 0,
        borderLeft: '1px solid var(--line-1)',
        background: 'var(--bg-1)',
        overflowY: 'auto',
      }}>
        <ReadinessCard spec={spec}/>
        <ContextBundleCard spec={spec}/>
        <SpawnedTasksCard spec={spec} tasks={tasks}/>
        <LinkedPitchCard spec={spec}/>
        <ActorsCard spec={spec} tasks={tasks}/>
      </div>
    </div>
  );
}

function Section({ id, label, type, count, children }) {
  return (
    <section id={id} style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          padding: '2px 6px',
          fontFamily: 'var(--font-mono)',
          fontSize: 10, fontWeight: 600,
          background: 'var(--bg-2)',
          border: '1px solid var(--line-2)',
          borderRadius: 'var(--r-1)',
          color: 'var(--fg-1)',
          letterSpacing: 0.3,
        }}>{label}</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{type}</div>
        {count != null && <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>· {count}</div>}
      </div>
      <div>{children}</div>
    </section>
  );
}

function ListRow({ bullet, color, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '4px 0', fontSize: 13, lineHeight: 1.55 }}>
      <span className="mono" style={{ color, width: 14, textAlign: 'center', flexShrink: 0, paddingTop: 2 }}>{bullet}</span>
      <span style={{ color: 'var(--fg-0)' }}>{children}</span>
    </div>
  );
}

function CriterionRow({ ac, open, onToggle }) {
  const typeLabel = { property: 'prop', integration: 'integ', bdd: 'bdd', manual: 'manual', eval: 'eval' }[ac.type] || ac.type;
  return (
    <div style={{
      border: '1px solid var(--line-1)',
      borderRadius: 'var(--r-2)',
      background: 'var(--bg-1)',
      overflow: 'hidden',
    }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px',
          cursor: 'pointer',
        }}>
        <Chip status={ac.status} size="sm" sparkline={ac.spark && ac.spark.length ? ac.spark : null}>
          {ac.status}
        </Chip>
        <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', padding: '1px 5px', background: 'var(--bg-inset)', borderRadius: 3 }}>{typeLabel}</span>
        <span style={{ flex: 1, fontSize: 12, color: 'var(--fg-0)' }}>{ac.statement}</span>
        {ac.flakiness > 0.1 && <span className="mono" style={{ fontSize: 10, color: 'var(--signal-amber)' }}>flaky {Math.round(ac.flakiness * 100)}%</span>}
        <span style={{ color: 'var(--fg-3)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform var(--dur-fast)' }}>
          <Icon name="chevRight" size={12}/>
        </span>
      </div>
      {open && (
        <div style={{
          borderTop: '1px solid var(--line-1)',
          padding: '10px 12px',
          background: 'var(--bg-inset)',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--fg-1)',
        }}>
          <div style={{ color: 'var(--fg-3)', marginBottom: 6 }}>// generated test · tests/acceptance/{ac.id}.test.ts</div>
          <div style={{ color: 'var(--fg-2)' }}>test(<span style={{ color: 'var(--signal-green)' }}>'{ac.statement.slice(0, 60)}...'</span>, async () =&gt; {'{'}</div>
          <div style={{ paddingLeft: 16, color: 'var(--fg-2)' }}>
            <div>const result = await runScenario(<span style={{ color: 'var(--accent-human)' }}>{ac.id}</span>);</div>
            <div>expect(result.metric).toBeWithin(<span style={{ color: 'var(--signal-amber)' }}>budget</span>);</div>
          </div>
          <div style={{ color: 'var(--fg-2)' }}>{'}'});</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
            <Button variant="ghost" size="sm" icon="play">Run</Button>
            <Button variant="ghost" size="sm" icon="link">Open file</Button>
            <Button variant="ghost" size="sm" icon="clock">Run history</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReadinessCard({ spec }) {
  const weights = [
    { key: 'Acceptance structure', weight: 40, score: 37, hint: 'all criteria typed' },
    { key: 'Non-goals present', weight: 20, score: 20, hint: 'present' },
    { key: 'Constraints specific', weight: 20, score: 18, hint: 'budgets named' },
    { key: 'Open questions resolved', weight: 10, score: 4, hint: '1 unresolved' },
    { key: 'Context bundle complete', weight: 10, score: 8, hint: '2 ADRs missing' },
  ];
  const pass = spec.readiness >= 70;
  return (
    <div style={{ padding: '16px', borderBottom: '1px solid var(--line-1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <SectionLabelSE>READINESS</SectionLabelSE>
        <div style={{ flex: 1 }}/>
        <Chip status={pass ? 'passing' : 'flaky'} size="sm">{pass ? 'spawn enabled' : 'below threshold'}</Chip>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span className="mono" style={{
          fontSize: 36, fontWeight: 600, letterSpacing: -1,
          color: pass ? 'var(--signal-green)' : 'var(--signal-amber)',
        }}>{spec.readiness}</span>
        <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>/ 100 · threshold 70</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {weights.map(w => (
          <div key={w.key}>
            <div style={{ display: 'flex', fontSize: 11, marginBottom: 2 }}>
              <span style={{ color: 'var(--fg-1)', flex: 1 }}>{w.key}</span>
              <span className="mono" style={{ color: 'var(--fg-3)' }}>{w.score}/{w.weight}</span>
            </div>
            <ProgressBar
              value={w.score} max={w.weight} height={2}
              color={w.score / w.weight >= 0.8 ? 'var(--signal-green)' : w.score / w.weight >= 0.5 ? 'var(--signal-amber)' : 'var(--signal-red)'}
            />
            {w.score < w.weight && (
              <div style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 2 }}>{w.hint}</div>
            )}
          </div>
        ))}
      </div>
      <Button variant="primary" size="md" style={{ width: '100%', marginTop: 12, justifyContent: 'center' }} icon="bolt" disabled={!pass}>
        Spawn tasks
      </Button>
    </div>
  );
}

function ContextBundleCard({ spec }) {
  const b = spec.contextBundle || {};
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line-1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <SectionLabelSE>CONTEXT BUNDLE</SectionLabelSE>
        <div style={{ flex: 1 }}/>
        <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>v8</span>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
        padding: 8,
        background: 'var(--bg-inset)',
        borderRadius: 'var(--r-2)',
        border: '1px solid var(--line-1)',
      }}>
        <MiniMetricSE label="files"  value={b.files}/>
        <MiniMetricSE label="ADRs"   value={b.adrs}/>
        <MiniMetricSE label="skills" value={b.skills}/>
        <MiniMetricSE label="MCP"    value={b.mcp}/>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        <Button variant="ghost" size="sm" icon="spec" style={{ flex: 1 }}>Preview</Button>
        <Button variant="ghost" size="sm" icon="git" style={{ flex: 1 }}>Diff</Button>
      </div>
    </div>
  );
}

function SpawnedTasksCard({ spec, tasks }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line-1)' }}>
      <SectionLabelSE>SPAWNED TASKS <span className="mono" style={{ color: 'var(--fg-3)', fontWeight: 400 }}>{tasks.length}</span></SectionLabelSE>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
        {tasks.map(t => {
          const h = window.HUMANS.find(x => x.id === t.assignee);
          const riskColor = { red: 'var(--signal-red)', amber: 'var(--signal-amber)', green: 'var(--signal-green)' }[t.risk];
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 11 }}>
              <span style={{ width: 4, height: 4, borderRadius: 999, background: riskColor }}/>
              <span className="mono" style={{ color: 'var(--fg-3)', width: 44 }}>{t.id}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: t.status === 'done' ? 'var(--fg-3)' : 'var(--fg-1)', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</span>
              {h && <Avatar name={h.name} kind="human" size={14}/>}
              {t.delegated && <span style={{ width: 6, height: 6, borderRadius: 2, background: 'var(--accent-agent)' }}/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LinkedPitchCard({ spec }) {
  const pitch = window.PITCHES.find(p => p.id === spec.pitch);
  if (!pitch) return null;
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line-1)' }}>
      <SectionLabelSE>LINKED PITCH</SectionLabelSE>
      <div style={{
        marginTop: 8,
        padding: 10,
        border: '1px solid var(--line-1)',
        borderLeft: '3px solid var(--signal-violet)',
        borderRadius: 'var(--r-2)',
        background: 'var(--bg-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{pitch.id}</span>
          <Chip status="active" size="sm">{pitch.appetite}</Chip>
        </div>
        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>{pitch.title}</div>
        <div style={{ fontSize: 10, color: 'var(--fg-3)', marginBottom: 3 }}>Hill chart</div>
        <HillChart position={pitch.hill}/>
      </div>
    </div>
  );
}

function HillChart({ position }) {
  // position: 0..1, where 0.5 is crest (uphill=discovery, downhill=execution)
  const w = 280, h = 50;
  const path = `M 0 ${h-4} Q ${w/2} ${-h*0.2}, ${w} ${h-4}`;
  const px = position * w;
  const py = h - 4 - Math.sin(position * Math.PI) * (h * 0.6);
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={path} fill="none" stroke="var(--line-2)" strokeWidth="1"/>
      <line x1={w/2} y1="0" x2={w/2} y2={h} stroke="var(--line-1)" strokeDasharray="2 2"/>
      <circle cx={px} cy={py} r="4" fill="var(--signal-violet)"/>
      <text x="4" y={h-1} fontSize="8" fontFamily="var(--font-mono)" fill="var(--fg-3)">unknowns</text>
      <text x={w-30} y={h-1} fontSize="8" fontFamily="var(--font-mono)" fill="var(--fg-3)">shipped</text>
    </svg>
  );
}

function ActorsCard({ spec, tasks }) {
  const humanSet = new Set(tasks.map(t => t.assignee));
  const agentSet = new Set(tasks.map(t => t.delegated).filter(Boolean));
  return (
    <div style={{ padding: '14px 16px' }}>
      <SectionLabelSE>ACTORS</SectionLabelSE>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[...humanSet].map(id => {
          const h = window.HUMANS.find(x => x.id === id);
          if (!h) return null;
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
              <Avatar name={h.name} kind="human" size={18}/>
              <span style={{ flex: 1 }}>{h.name}</span>
              <span style={{ color: 'var(--fg-3)' }}>{tasks.filter(t => t.assignee === id).length} tasks</span>
            </div>
          );
        })}
        {[...agentSet].map(id => {
          const a = window.AGENTS.find(x => x.id === id);
          if (!a) return null;
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
              <Avatar name={a.name} kind="agent" size={18}/>
              <span className="mono" style={{ flex: 1 }}>{a.name}</span>
              <span style={{ color: 'var(--fg-3)' }}>{tasks.filter(t => t.delegated === id).length} delegated</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const SectionLabelSE = ({ children }) => (
  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-3)', letterSpacing: 0.8, textTransform: 'uppercase' }}>{children}</span>
);
const MiniMetricSE = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 10, color: 'var(--fg-3)', marginBottom: 1 }}>{label}</div>
    <div className="mono" style={{ fontSize: 13, color: 'var(--fg-0)', fontWeight: 500 }}>{value}</div>
  </div>
);

Object.assign(window, { SpecEditor });
