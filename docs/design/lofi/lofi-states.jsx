// Empty / error / loading states for the four built P0 surfaces.
// Static snapshots; arranged in a 2-col grid for each surface.

const StateCard = ({ kind, label, children }) => (
  <div className={"state-card " + kind}>
    <div className="state-tag mono">{kind} · {label}</div>
    <div className="state-body">{children}</div>
  </div>
);

// Work Graph — empty / loading / error
const WGStates = () => (
  <div className="states-grid">
    <StateCard kind="empty" label="work-graph">
      <div className="wg-empty">
        <div className="wg-empty-art">
          <svg viewBox="0 0 120 80" width="120" height="80">
            <circle cx="20" cy="40" r="6" className="wg-ghost" />
            <circle cx="60" cy="20" r="6" className="wg-ghost" />
            <circle cx="60" cy="60" r="6" className="wg-ghost" />
            <circle cx="100" cy="40" r="6" className="wg-ghost" />
            <path d="M26 40 L54 22 M26 40 L54 58 M66 20 L94 38 M66 60 L94 42" className="wg-ghost-edge" />
          </svg>
        </div>
        <div className="state-title">Nothing in flight yet</div>
        <div className="state-sub">Shape a pitch or import a spec to populate the graph.</div>
        <div className="state-cta">
          <button className="cta-prim">New pitch</button>
          <button className="cta-ghost">Import spec</button>
        </div>
      </div>
    </StateCard>

    <StateCard kind="loading" label="work-graph">
      <div className="wg-loading">
        <div className="skel-node" style={{ left: "12%", top: "32%" }} />
        <div className="skel-node" style={{ left: "36%", top: "18%" }} />
        <div className="skel-node" style={{ left: "36%", top: "58%" }} />
        <div className="skel-node" style={{ left: "62%", top: "32%" }} />
        <div className="skel-node" style={{ left: "84%", top: "48%" }} />
        <div className="skel-edge" style={{ left: "16%", top: "36%", width: "20%" }} />
        <div className="skel-edge" style={{ left: "40%", top: "30%", width: "22%" }} />
        <div className="skel-edge" style={{ left: "66%", top: "38%", width: "18%" }} />
        <div className="state-caption mono">resolving graph · 20 nodes · 34 edges</div>
      </div>
    </StateCard>

    <StateCard kind="error" label="work-graph">
      <div className="wg-error">
        <div className="err-ic mono">!</div>
        <div className="state-title">Graph out of sync</div>
        <div className="state-sub">
          Couldn't reach <span className="mono">workspace://graph</span> — the last successful sync was 8 min ago.
          Showing cached view.
        </div>
        <div className="state-cta">
          <button className="cta-prim">Retry now</button>
          <button className="cta-ghost">Keep cached view</button>
        </div>
        <div className="err-trace mono">E_MCP_TIMEOUT · atlas-edge-3 · trace 9f2e1</div>
      </div>
    </StateCard>
  </div>
);

// Spec Editor — gated below readiness, failing acceptance, stale bundle
const SEStates = () => (
  <div className="states-grid">
    <StateCard kind="gated" label="spec-editor · readiness 52/100">
      <div className="se-gated">
        <div className="se-score-ring low">
          <div className="se-score-num">52</div>
          <div className="se-score-cap mono">readiness</div>
        </div>
        <div className="se-gated-body">
          <div className="state-title">Spawn disabled</div>
          <div className="state-sub">
            Three blocking gaps. Fix any two to cross the 70 threshold.
          </div>
          <ul className="se-gaps">
            <li><span className="gap-dot" /> <span>No non-goals — add ≥2</span></li>
            <li><span className="gap-dot" /> <span>Acceptance has 1 criterion, none property/integration</span></li>
            <li><span className="gap-dot amber" /> <span>Open question blocks spawn: "Who owns hold-window config?"</span></li>
          </ul>
          <div className="state-cta">
            <button className="cta-prim">Ask an agent to draft</button>
            <button className="cta-ghost">Edit manually</button>
          </div>
        </div>
      </div>
    </StateCard>

    <StateCard kind="failing" label="spec-editor · 2/4 acceptance failing">
      <div className="se-fail">
        <div className="state-title">Acceptance failing since 3f2a9bd</div>
        <div className="se-ac-list">
          <div className="se-ac fail">
            <span className="ac-dot fail" />
            <span className="ac-txt">Amber PRs hold for configured window</span>
            <span className="ac-meta mono">2 runs · 12m ago</span>
          </div>
          <div className="se-ac fail">
            <span className="ac-dot fail" />
            <span className="ac-txt">Sampled L2 merges appear in digest</span>
            <span className="ac-meta mono">1 run · 12m ago</span>
          </div>
          <div className="se-ac pass"><span className="ac-dot pass" /><span className="ac-txt">Green PRs merge within 90s p50</span></div>
          <div className="se-ac pass"><span className="ac-dot pass" /><span className="ac-txt">Red PRs never auto-merge</span></div>
        </div>
        <div className="state-cta">
          <button className="cta-prim">Spawn agent to fix</button>
          <button className="cta-ghost">Open failing run</button>
        </div>
      </div>
    </StateCard>

    <StateCard kind="stale" label="spec-editor · bundle resolution failed">
      <div className="se-stale">
        <div className="err-ic mono amber">⟳</div>
        <div className="state-title">Context bundle out of date</div>
        <div className="state-sub">
          4 files referenced by this bundle were deleted or moved in the last merge.
          Agents spawned from this spec will error on `E_CONTEXT_STALE`.
        </div>
        <div className="se-stale-files mono">
          <div>✕ src/agents/risk_v0.ts <span className="dim">(deleted)</span></div>
          <div>→ src/agents/risk_v1.ts <span className="dim">(moved from risk_v0.ts)</span></div>
          <div>✕ docs/policies/amber.md <span className="dim">(deleted)</span></div>
          <div className="dim">+1 more</div>
        </div>
        <div className="state-cta">
          <button className="cta-prim">Re-resolve bundle</button>
          <button className="cta-ghost">Review changes</button>
        </div>
      </div>
    </StateCard>
  </div>
);

// Agent Run Panel — pending / elicit / error
const ARStates = () => (
  <div className="states-grid">
    <StateCard kind="elicit" label="agent-run · awaiting_input">
      <div className="ar-elicit">
        <div className="ar-head">
          <span className="mono">sess_7c1a</span>
          <span className="ar-status mono">awaiting input</span>
          <span className="ar-budget mono">1,240 / 2,400 ACU</span>
        </div>
        <div className="ar-elicit-q">
          <div className="mono faint">elicitation · raised 3m ago</div>
          <div className="ar-q">
            Hold window for amber PRs: which do you want as the default?
          </div>
          <div className="ar-opts">
            <button className="ar-opt">15 min — low friction, some risk</button>
            <button className="ar-opt selected">1 h — matches INC-221 timing</button>
            <button className="ar-opt">4 h — max reviewer coverage</button>
          </div>
          <label className="ar-check mono">
            <input type="checkbox" defaultChecked /> write answer back to spec as decision
          </label>
        </div>
        <div className="ar-hint mono">
          session idle until answered · times out in 23h 57m
        </div>
      </div>
    </StateCard>

    <StateCard kind="error" label="agent-run · error">
      <div className="ar-error">
        <div className="ar-head">
          <span className="mono">sess_9f2e</span>
          <span className="ar-status mono err">error</span>
          <span className="ar-budget mono">2,400 / 2,400 ACU</span>
        </div>
        <div className="ar-err-body">
          <div className="err-code mono">E_BUDGET_EXCEEDED</div>
          <div className="state-title">Session halted — budget spent</div>
          <div className="state-sub">
            Agent reached 100% of its ACU ceiling before completing tests.
            Last checkpoint at 78% self-assessment pass.
          </div>
          <div className="state-cta">
            <button className="cta-prim">Allocate +600 ACU</button>
            <button className="cta-ghost">Reassign to human</button>
            <button className="cta-ghost">Kill session</button>
          </div>
        </div>
      </div>
    </StateCard>

    <StateCard kind="stale" label="agent-run · stale heartbeat">
      <div className="ar-stale">
        <div className="ar-head">
          <span className="mono">sess_2b4d</span>
          <span className="ar-status mono stale">stale</span>
          <span className="ar-budget mono">890 / 1,800 ACU</span>
        </div>
        <div className="ar-stale-body">
          <div className="state-sub">
            No heartbeat for 94s. Next tool call will fail with
            <span className="mono"> E_SESSION_STALE</span>.
          </div>
          <div className="state-cta">
            <button className="cta-prim">Resume</button>
            <button className="cta-ghost">Fork from last checkpoint</button>
          </div>
        </div>
      </div>
    </StateCard>
  </div>
);

// Digest — empty + red-risk override + single-item
const DGStates = () => (
  <div className="states-grid">
    <StateCard kind="empty" label="digest · quiet night">
      <div className="dg-empty">
        <div className="dg-sun">
          <svg viewBox="0 0 80 40" width="80" height="40">
            <path d="M 0 30 Q 40 -5 80 30" className="dg-horizon" />
            <circle cx="40" cy="22" r="8" className="dg-sun-circle" />
          </svg>
        </div>
        <div className="state-title">Quiet night.</div>
        <div className="state-sub">No sessions completed overnight. 3 still running, 0 elicitations waiting.</div>
        <div className="dg-keep mono">tuesday · 9 : 02 am</div>
      </div>
    </StateCard>

    <StateCard kind="blocker" label="digest · red-risk override">
      <div className="dg-block">
        <div className="dg-red-strip mono">risk · red · auto-merge halted</div>
        <div className="state-title">1 PR needs you before anything else</div>
        <div className="dg-pr">
          <div className="dg-pr-title">#423 · Classifier: ml_model signal</div>
          <div className="dg-pr-by mono">@claude-backend · 2,100 ACU · 4 files</div>
          <div className="dg-pr-sig">
            <span className="chip red">ml_model</span>
            <span className="chip red">new_dependency</span>
            <span className="chip amber">lines: 312</span>
          </div>
          <div className="state-cta">
            <button className="cta-prim">Open diff</button>
            <button className="cta-ghost">Request changes</button>
            <button className="cta-ghost">Escalate to dani</button>
          </div>
        </div>
        <div className="dg-rest mono">+ 6 other items queued below</div>
      </div>
    </StateCard>

    <StateCard kind="loading" label="digest · regenerating">
      <div className="dg-loading">
        <div className="skel-line w80" />
        <div className="skel-line w60" />
        <div className="skel-card" />
        <div className="skel-card" />
        <div className="skel-card narrow" />
        <div className="state-caption mono">summarizing 12 sessions · ~8s</div>
      </div>
    </StateCard>
  </div>
);

window.LoFiStates = { WGStates, SEStates, ARStates, DGStates };
