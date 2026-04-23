// Living Artifact — low-fi. The spec in its post-shipped life: branches,
// PRs, deploys, incidents, all wired back to the spec that birthed them.

const LoFiArtifact = () => (
  <div className="lofi-art">
    <div className="la-head">
      <div className="la-title-row">
        <span className="la-crumb mono">meridian-payments / specs /</span>
        <span className="la-title">S-142 · Risk-aware auto-merge</span>
        <span className="la-status shipped">shipped</span>
      </div>
      <div className="la-meta mono">
        v 14 · head 3f2a9bd · shipped 6d ago · 4 PRs · 2 deploys · 1 incident
      </div>
    </div>

    <div className="la-tabs mono">
      <span className="la-tab">Spec</span>
      <span className="la-tab active">Living</span>
      <span className="la-tab">History</span>
      <span className="la-tab">Decisions</span>
    </div>

    <div className="la-grid">
      {/* LEFT — river of activity */}
      <div className="la-river">
        <RiverGroup title="branches" count={2}>
          <BranchRow name="feat/auto-merge-hold" head="3f2a9bd" stale={false} />
          <BranchRow name="feat/hold-config-ui" head="a7d10e1" stale={true} />
        </RiverGroup>

        <RiverGroup title="pull requests" count={4}>
          <PrRow n={412} title="Amber-hold scheduler" state="merged" ci="passing" author="@claude-backend" preview={null} auto />
          <PrRow n={418} title="Hold-config schema" state="merged" ci="passing" author="dani" preview={null} />
          <PrRow n={421} title="Digest: held-PR section" state="open" ci="passing" author="@claude-frontend" preview="pr-421.meridian.dev" />
          <PrRow n={423} title="Classifier: ml_model signal" state="open" ci="failing" author="@claude-backend" preview={null} />
        </RiverGroup>

        <RiverGroup title="deploys" count={2}>
          <DeployRow ring="canary" commit="3f2a9bd" when="6d ago" status="succeeded" />
          <DeployRow ring="prod" commit="3f2a9bd" when="4d ago" status="succeeded" />
        </RiverGroup>

        <RiverGroup title="incidents" count={1}>
          <IncidentRow id="INC-221" title="Amber holds leaking past 1h window" status="resolved" />
        </RiverGroup>
      </div>

      {/* RIGHT — acceptance health + key sparklines */}
      <div className="la-side">
        <div className="la-card">
          <div className="la-card-head mono">acceptance · live</div>
          <AcRow txt="Green PRs merge within 90s p50" state="pass" />
          <AcRow txt="Amber PRs hold for configured window" state="pass" />
          <AcRow txt="Red PRs never auto-merge" state="pass" />
          <AcRow txt="Sampled L2 merges appear in digest" state="flaky" />
          <div className="la-card-foot mono">4 / 4 passing · 1 flaky · last run 12m ago</div>
        </div>

        <div className="la-card">
          <div className="la-card-head mono">health · 7d</div>
          <Metric label="auto-merge rate" v="78%" delta="+4%" good />
          <Metric label="rollback rate" v="0.4%" delta="−0.6%" good />
          <Metric label="p50 time-to-merge" v="3.2m" delta="−1.1m" good />
          <Metric label="flagged amber" v="18" delta="+6" />
        </div>

        <div className="la-card">
          <div className="la-card-head mono">decisions emitted</div>
          <AdrRow title="Amber hold window default = 1h" by="@claude-backend" />
          <AdrRow title="Risk classifier v1 is rules-only" by="dani" />
        </div>
      </div>
    </div>

    <div className="la-foot mono">
      this view is recomputed on every PR/deploy/incident event · workspace://specs/S-142/living
    </div>
  </div>
);

const RiverGroup = ({ title, count, children }) => (
  <div className="river-grp">
    <div className="river-grp-head mono">{title} · {count}</div>
    <div className="river-grp-body">{children}</div>
  </div>
);

const BranchRow = ({ name, head, stale }) => (
  <div className={"river-row" + (stale ? " stale" : "")}>
    <span className="rr-ic">⎇</span>
    <span className="rr-name mono">{name}</span>
    <span className="rr-dim mono">@ {head}</span>
    {stale && <span className="rr-tag">stale</span>}
  </div>
);

const PrRow = ({ n, title, state, ci, author, preview, auto }) => (
  <div className="river-row">
    <span className={"rr-pr mono " + state}>#{n}</span>
    <span className="rr-title">{title}</span>
    <div className="rr-tail">
      {auto && <span className="rr-tag acid">auto</span>}
      <span className={"rr-ci " + ci}>{ci}</span>
      <span className="rr-author mono">{author}</span>
      {preview && <span className="rr-preview mono">↗ preview</span>}
    </div>
  </div>
);

const DeployRow = ({ ring, commit, when, status }) => (
  <div className="river-row">
    <span className="rr-ring mono">{ring}</span>
    <span className="rr-dim mono">{commit}</span>
    <span className="rr-title">{when}</span>
    <span className={"rr-tag " + status}>{status}</span>
  </div>
);

const IncidentRow = ({ id, title, status }) => (
  <div className="river-row">
    <span className="rr-inc mono">{id}</span>
    <span className="rr-title">{title}</span>
    <span className={"rr-tag " + status}>{status}</span>
  </div>
);

const AcRow = ({ txt, state }) => (
  <div className="ac-row">
    <span className={"ac-dot " + state} />
    <span className="ac-txt">{txt}</span>
  </div>
);

const Metric = ({ label, v, delta, good }) => (
  <div className="metric-row">
    <span className="metric-label">{label}</span>
    <span className="metric-v mono">{v}</span>
    <span className={"metric-d mono " + (good ? "good" : "")}>{delta}</span>
  </div>
);

const AdrRow = ({ title, by }) => (
  <div className="adr-row">
    <span className="adr-ic mono">ADR</span>
    <span className="adr-title">{title}</span>
    <span className="adr-by mono">{by}</span>
  </div>
);

window.LoFiArtifact = LoFiArtifact;
