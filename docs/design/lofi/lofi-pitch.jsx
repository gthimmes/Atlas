// Pitch Shaping — low-fi. Shape Up's fat-marker sketch + problem/appetite/
// rabbit-holes/no-gos, scaled for Atlas. This is a design reference, not
// production. No click handlers — it's a still frame.

const LoFiPitch = () => (
  <div className="lofi-pitch">
    <div className="lp-head">
      <div className="lp-title-row">
        <input className="lp-title" defaultValue="Risk-aware auto-merge for L2 agents" />
        <span className="lp-status">shaping</span>
      </div>
      <div className="lp-meta mono">
        pitch_a3f · by dani · 3 collaborators · last edit 14m ago
      </div>
    </div>

    <div className="lp-grid">
      {/* LEFT — structured Shape Up fields */}
      <div className="lp-left">
        <LpField label="Problem">
          <textarea defaultValue={"L2 agents auto-merge too aggressively when risk classifier returns amber. We've had 3 rollbacks this month where amber should have been red. Reviewers want a safety net without losing the speed we get from auto-merge."} />
        </LpField>

        <LpField label="Appetite">
          <div className="lp-appetite">
            <label className="lp-radio"><input type="radio" name="app" /> Small · 2 weeks</label>
            <label className="lp-radio checked"><input type="radio" name="app" defaultChecked /> Big · 6 weeks</label>
            <label className="lp-radio"><input type="radio" name="app" /> Custom</label>
            <span className="lp-budget mono">≈ 7,200 ACU budget</span>
          </div>
        </LpField>

        <LpField label="No-gos">
          <ul className="lp-list">
            <li>No new ML models; stays rules-based</li>
            <li>Don't touch payments path allowlist</li>
            <li>No changes to Spec Editor readiness formula</li>
          </ul>
          <button className="lp-add mono">+ add</button>
        </LpField>

        <LpField label="Rabbit holes">
          <ul className="lp-list">
            <li>Learned classifier (deferred to v2 per decision #5)</li>
            <li>Per-file reviewer routing</li>
          </ul>
          <button className="lp-add mono">+ add</button>
        </LpField>
      </div>

      {/* RIGHT — fat-marker canvas + hill chart */}
      <div className="lp-right">
        <div className="lp-canvas">
          <div className="lp-canvas-head">
            <span className="lp-canvas-title">Solution sketch</span>
            <div className="lp-tools">
              <button className="lp-tool active">marker</button>
              <button className="lp-tool">text</button>
              <button className="lp-tool">arrow</button>
            </div>
          </div>
          <svg className="lp-canvas-svg" viewBox="0 0 520 260" preserveAspectRatio="xMidYMid meet">
            {/* Fat-marker boxes */}
            <rect x="30"  y="40"  width="130" height="60" rx="4" className="fm-box" />
            <text x="95"  y="76"  className="fm-label" textAnchor="middle">PR opens</text>

            <rect x="200" y="40"  width="130" height="60" rx="4" className="fm-box" />
            <text x="265" y="68"  className="fm-label" textAnchor="middle">classify risk</text>
            <text x="265" y="86"  className="fm-sub mono" textAnchor="middle">(rules v1)</text>

            <rect x="370" y="20"  width="130" height="40" rx="4" className="fm-box ok" />
            <text x="435" y="45"  className="fm-label" textAnchor="middle">green → merge</text>

            <rect x="370" y="78"  width="130" height="40" rx="4" className="fm-box warn" />
            <text x="435" y="103" className="fm-label" textAnchor="middle">amber → hold 1h</text>

            <rect x="370" y="136" width="130" height="40" rx="4" className="fm-box err" />
            <text x="435" y="161" className="fm-label" textAnchor="middle">red → human</text>

            {/* arrows */}
            <path d="M 160 70 L 200 70" className="fm-arrow" markerEnd="url(#ah)" />
            <path d="M 330 60 L 370 40" className="fm-arrow" markerEnd="url(#ah)" />
            <path d="M 330 70 L 370 98" className="fm-arrow" markerEnd="url(#ah)" />
            <path d="M 330 80 L 370 156" className="fm-arrow" markerEnd="url(#ah)" />

            {/* annotation */}
            <text x="265" y="180" className="fm-annot">↑ the hold window is the whole bet</text>
            <text x="265" y="196" className="fm-annot mono">(config: 15m / 1h / 4h)</text>

            <defs>
              <marker id="ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto">
                <path d="M0 0 L8 4 L0 8 z" fill="currentColor" />
              </marker>
            </defs>
          </svg>
        </div>

        <div className="lp-hill">
          <div className="lp-canvas-head">
            <span className="lp-canvas-title">Hill tracks</span>
            <button className="lp-add mono">+ track</button>
          </div>
          <HillTrack label="Classifier amber-hold pipeline" pos={0.62} />
          <HillTrack label="Hold-window config UI" pos={0.28} />
          <HillTrack label="Digest: held-PR surface" pos={0.08} />
        </div>
      </div>
    </div>

    <div className="lp-foot">
      <div className="lp-foot-left mono">hills move every check-in · cool-down 2 wks after ship</div>
      <div className="lp-foot-right">
        <button className="lp-btn ghost">save draft</button>
        <button className="lp-btn">move to table →</button>
      </div>
    </div>
  </div>
);

const LpField = ({ label, children }) => (
  <div className="lp-field">
    <label className="lp-label mono">{label}</label>
    <div className="lp-field-body">{children}</div>
  </div>
);

const HillTrack = ({ label, pos }) => (
  <div className="hill-row">
    <div className="hill-label">{label}</div>
    <div className="hill-chart">
      <svg viewBox="0 0 200 40" preserveAspectRatio="none">
        <path d="M 0 35 Q 50 35 100 5 Q 150 35 200 35" className="hill-path" />
        <circle cx={pos * 200} cy={hillY(pos)} r="5" className="hill-dot" />
      </svg>
      <div className="hill-phase mono">
        <span className={pos < 0.5 ? "on" : ""}>figuring out</span>
        <span className={pos >= 0.5 ? "on" : ""}>getting done</span>
      </div>
    </div>
  </div>
);
function hillY(p) {
  // Parabolic approximation of the hill curve
  const x = p * 200;
  // rough mirror of the quadratic: peak y≈5 at x=100, y≈35 at edges
  return 35 - 30 * (1 - Math.pow((x - 100) / 100, 2));
}

window.LoFiPitch = LoFiPitch;
