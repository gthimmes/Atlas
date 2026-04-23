/* Atlas — Work Graph surface.
   Directed graph of specs → tasks → agent sessions, with parallel agent lanes,
   actor color-coding, time scrubber, and inspector.
*/

const { useState: useStateWG, useEffect: useEffectWG, useRef: useRefWG, useMemo: useMemoWG, useCallback: useCallbackWG } = React;

const STATUS_STYLE = {
  proposed:   { label: 'proposed',   fg: 'var(--fg-2)',      bg: 'var(--bg-2)',     border: 'var(--line-2)',      dashed: true },
  in_flight:  { label: 'in flight',  fg: 'var(--fg-0)',      bg: 'var(--bg-2)',     border: 'var(--line-strong)' },
  review:     { label: 'review',     fg: 'var(--fg-0)',      bg: 'var(--bg-2)',     border: 'var(--signal-amber)' },
  done:       { label: 'done',       fg: 'var(--fg-2)',      bg: 'var(--bg-inset)', border: 'var(--line-1)' },
  blocked:    { label: 'blocked',    fg: 'var(--signal-red)',bg: 'var(--bg-2)',     border: 'var(--signal-red)' },
};

function WorkGraph({ onOpenSpec, onOpenTask }) {
  const specs = window.SPECS.filter(s => s.status === 'in_flight' || s.status === 'shaped');
  const tasks = window.TASKS;
  const sessions = window.SESSIONS;

  // Layout: columns = specs; rows within each column = tasks; sessions hover off tasks.
  // We position everything on a 2000 x 1200 canvas scaled via CSS transform for zoom/pan.
  const [zoom, setZoom] = useStateWG(1);
  const [pan, setPan] = useStateWG({ x: 0, y: 0 });
  const [dragging, setDragging] = useStateWG(null); // {startX, startY, origX, origY}
  const [hover, setHover] = useStateWG(null);
  const [selected, setSelected] = useStateWG({ kind: 'spec', id: 'S-142' });
  const [filterHumans, setFilterHumans] = useStateWG(true);
  const [filterAgents, setFilterAgents] = useStateWG(true);
  const [time, setTime] = useStateWG(100); // 0..100, 100 = now
  const [draggedNode, setDraggedNode] = useStateWG(null); // node id being dragged
  const [nodeOverrides, setNodeOverrides] = useStateWG({}); // {nodeId: {dx, dy}}

  const canvasRef = useRefWG();

  // Build node positions
  const layout = useMemoWG(() => {
    const nodes = [];
    const edges = [];
    const columnWidth = 440;
    const nodeHeight = 44;
    const rowGap = 14;
    const colX = 80;
    const topY = 120;

    specs.forEach((spec, ci) => {
      const x = colX + ci * columnWidth;
      // spec node
      nodes.push({
        id: spec.id, kind: 'spec', x, y: topY, w: 360, h: 64, data: spec,
      });

      const specTasks = tasks.filter(t => t.spec === spec.id);
      specTasks.forEach((task, ti) => {
        const ty = topY + 100 + ti * (nodeHeight + rowGap);
        nodes.push({
          id: task.id, kind: 'task', x: x + 30, y: ty, w: 300, h: nodeHeight, data: task,
        });
        edges.push({ from: spec.id, to: task.id, kind: 'spawned' });

        // Session attached to task
        if (task.delegated) {
          const sess = sessions.find(s => s.agent === task.delegated && s.task === task.id);
          if (sess) {
            nodes.push({
              id: sess.id, kind: 'session', x: x + 340, y: ty + 4, w: 58, h: 36, data: sess, task: task,
            });
            edges.push({ from: task.id, to: sess.id, kind: 'delegated' });
          }
        }
      });
    });

    // Cross-spec dependency edges (hand-wired)
    edges.push({ from: 'T-821', to: 'T-820', kind: 'blocks' });
    edges.push({ from: 'T-823', to: 'T-822', kind: 'blocks' });

    return { nodes, edges };
  }, [specs, tasks, sessions]);

  const getNode = (id) => {
    const n = layout.nodes.find(n => n.id === id);
    if (!n) return null;
    const o = nodeOverrides[id];
    return o ? { ...n, x: n.x + o.dx, y: n.y + o.dy } : n;
  };

  // Pan handling
  const onMouseDown = (e) => {
    if (e.target.closest('.wg-node') || e.target.closest('.wg-ui')) return;
    setDragging({ startX: e.clientX, startY: e.clientY, origX: pan.x, origY: pan.y });
  };
  useEffectWG(() => {
    const move = (e) => {
      if (dragging) {
        setPan({ x: dragging.origX + (e.clientX - dragging.startX), y: dragging.origY + (e.clientY - dragging.startY) });
      }
      if (draggedNode) {
        setNodeOverrides(prev => ({
          ...prev,
          [draggedNode.id]: {
            dx: (prev[draggedNode.id]?.dx || 0) + e.movementX / zoom,
            dy: (prev[draggedNode.id]?.dy || 0) + e.movementY / zoom,
          }
        }));
      }
    };
    const up = () => { setDragging(null); setDraggedNode(null); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [dragging, draggedNode, zoom]);

  // Wheel zoom
  const onWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom(z => Math.max(0.4, Math.min(2, z - e.deltaY * 0.002)));
  };

  const zoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const currentSelection = useMemoWG(() => {
    if (!selected) return null;
    if (selected.kind === 'spec') return window.SPECS.find(s => s.id === selected.id);
    if (selected.kind === 'task') return window.TASKS.find(t => t.id === selected.id);
    if (selected.kind === 'session') return window.SESSIONS.find(s => s.id === selected.id);
    return null;
  }, [selected]);

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {/* Graph canvas */}
      <div
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onWheel={onWheel}
        style={{
          flex: 1,
          position: 'relative',
          background: 'var(--bg-0)',
          backgroundImage: `radial-gradient(var(--line-1) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          overflow: 'hidden',
          cursor: dragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        {/* Top control strip */}
        <div className="wg-ui" style={{
          position: 'absolute', top: 12, left: 12, right: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          zIndex: 10, pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', gap: 6, pointerEvents: 'auto' }}>
            <div style={{
              display: 'flex', gap: 4, padding: 4,
              background: 'var(--bg-1)', border: '1px solid var(--line-1)', borderRadius: 'var(--r-2)',
              boxShadow: 'var(--shadow-1)',
            }}>
              <Button variant="ghost" size="sm" icon="human" active={filterHumans} onClick={() => setFilterHumans(v => !v)}>Humans</Button>
              <Button variant="ghost" size="sm" icon="bolt" active={filterAgents} onClick={() => setFilterAgents(v => !v)}>Agents</Button>
              <Divider vertical style={{ margin: '2px 2px' }}/>
              <Button variant="ghost" size="sm" icon="filter">All projects</Button>
              <Button variant="ghost" size="sm" icon="filter">Status: any</Button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, pointerEvents: 'auto' }}>
            <Segmented
              options={[
                { value: 'graph', label: 'Graph', icon: 'graph' },
                { value: 'board', label: 'Board', icon: 'spec' },
                { value: 'list',  label: 'List',  icon: 'digest' },
              ]}
              value="graph"
              onChange={() => {}}
            />
          </div>
        </div>

        {/* Time scrubber (bottom) */}
        <div className="wg-ui" style={{
          position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 12px',
          background: 'var(--bg-1)', border: '1px solid var(--line-1)', borderRadius: 'var(--r-pill)',
          boxShadow: 'var(--shadow-1)',
          zIndex: 10,
          width: 520,
        }}>
          <Icon name="clock" size={12}/>
          <span className="mono" style={{ fontSize: 10, color: 'var(--fg-2)', minWidth: 48 }}>
            {time < 35 ? 'yesterday' : time < 80 ? 'today' : time < 98 ? 'now' : '+1 day'}
          </span>
          <input
            type="range" min="0" max="110" value={time}
            onChange={(e) => setTime(+e.target.value)}
            style={{ flex: 1, accentColor: 'var(--accent-human)' }}
          />
          <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>scrub time</span>
        </div>

        {/* Zoom controls */}
        <div className="wg-ui" style={{
          position: 'absolute', bottom: 14, right: 14,
          display: 'flex', flexDirection: 'column', gap: 4,
          padding: 4,
          background: 'var(--bg-1)', border: '1px solid var(--line-1)', borderRadius: 'var(--r-2)',
          boxShadow: 'var(--shadow-1)', zIndex: 10,
        }}>
          <Button variant="ghost" size="sm" icon="plus" onClick={() => setZoom(z => Math.min(2, z + 0.1))} title="Zoom in"/>
          <Button variant="ghost" size="sm" icon="minus" onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} title="Zoom out"/>
          <Button variant="ghost" size="sm" onClick={zoomReset} title="Reset">
            <span className="mono" style={{ fontSize: 10 }}>{Math.round(zoom * 100)}%</span>
          </Button>
        </div>

        {/* Legend */}
        <div className="wg-ui" style={{
          position: 'absolute', top: 60, left: 12,
          padding: '8px 10px',
          background: 'var(--bg-1)', border: '1px solid var(--line-1)', borderRadius: 'var(--r-2)',
          boxShadow: 'var(--shadow-1)', zIndex: 10,
          display: 'flex', flexDirection: 'column', gap: 4,
          fontSize: 10, color: 'var(--fg-2)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 2 }}>LEGEND</div>
          <LegendRow color="var(--accent-human)" shape="circle" label="Human-owned"/>
          <LegendRow color="var(--accent-agent)" shape="square" label="Agent session"/>
          <LegendRow color="var(--signal-amber)" shape="dash" label="Risk flagged"/>
          <LegendRow color="var(--fg-3)" shape="dot" label="Proposed"/>
        </div>

        {/* Scaled graph layer */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: dragging || draggedNode ? 'none' : 'transform var(--dur-med) var(--ease)',
        }}>
          {/* Column headers (pitches) */}
          {specs.map((spec, ci) => {
            const pitch = window.PITCHES.find(p => p.id === spec.pitch);
            if (!pitch) return null;
            return (
              <div key={spec.id + '-header'} style={{
                position: 'absolute',
                left: 80 + ci * 440 - 30,
                top: 40,
                width: 360 + 60,
                fontSize: 11, color: 'var(--fg-3)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Chip status="active" mono>{pitch.id}</Chip>
                <span style={{ fontWeight: 500, color: 'var(--fg-1)' }}>{pitch.title}</span>
                <span className="mono" style={{ color: 'var(--fg-3)' }}>· {pitch.appetite}</span>
              </div>
            );
          })}

          {/* Edges */}
          <svg style={{
            position: 'absolute', top: 0, left: 0, width: 2000, height: 1400,
            pointerEvents: 'none', overflow: 'visible',
          }}>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="var(--line-strong)"/>
              </marker>
              <marker id="arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="var(--signal-red)"/>
              </marker>
            </defs>
            {layout.edges.map((e, i) => {
              const from = getNode(e.from);
              const to = getNode(e.to);
              if (!from || !to) return null;
              const x1 = from.x + from.w, y1 = from.y + from.h / 2;
              const x2 = to.x, y2 = to.y + to.h / 2;
              const midX = (x1 + x2) / 2;
              const path = `M ${x1} ${y1} C ${midX} ${y1} ${midX} ${y2} ${x2} ${y2}`;
              if (e.kind === 'spawned') {
                return <path key={i} d={path} stroke="var(--line-2)" strokeWidth="1.2" fill="none" />;
              }
              if (e.kind === 'delegated') {
                return <path key={i} d={path} stroke="var(--accent-agent)" strokeWidth="1.2" fill="none" strokeDasharray="4 3" opacity="0.8"/>;
              }
              if (e.kind === 'blocks') {
                return <path key={i} d={path} stroke="var(--signal-red)" strokeWidth="1.2" fill="none" markerEnd="url(#arrow-red)" opacity="0.8"/>;
              }
              return null;
            })}
          </svg>

          {/* Nodes */}
          {layout.nodes.map((n) => {
            const node = getNode(n.id);
            const isSelected = selected?.id === n.id;
            const isHovered = hover === n.id;
            if (n.kind === 'spec') {
              return (
                <SpecNode
                  key={n.id} node={node} spec={n.data}
                  selected={isSelected} hovered={isHovered}
                  onHover={setHover}
                  onClick={() => setSelected({ kind: 'spec', id: n.id })}
                  onDoubleClick={() => onOpenSpec && onOpenSpec(n.id)}
                  onDragStart={(e) => { e.stopPropagation(); setDraggedNode({ id: n.id }); }}
                />
              );
            }
            if (n.kind === 'task') {
              return (
                <TaskNode
                  key={n.id} node={node} task={n.data}
                  selected={isSelected} hovered={isHovered}
                  onHover={setHover}
                  onClick={() => setSelected({ kind: 'task', id: n.id })}
                  onDragStart={(e) => { e.stopPropagation(); setDraggedNode({ id: n.id }); }}
                />
              );
            }
            if (n.kind === 'session') {
              return (
                <SessionNode
                  key={n.id} node={node} sess={n.data} task={n.task}
                  selected={isSelected} hovered={isHovered}
                  onHover={setHover}
                  onClick={() => setSelected({ kind: 'session', id: n.id })}
                  onDragStart={(e) => { e.stopPropagation(); setDraggedNode({ id: n.id }); }}
                />
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* Inspector */}
      <div style={{
        width: 340, flexShrink: 0,
        borderLeft: '1px solid var(--line-1)',
        background: 'var(--bg-1)',
        overflowY: 'auto',
      }}>
        <Inspector selection={currentSelection} selectionKind={selected?.kind} onOpenSpec={onOpenSpec}/>
      </div>
    </div>
  );
}

function LegendRow({ color, shape, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {shape === 'circle' && <span style={{ width: 8, height: 8, borderRadius: 999, background: color }}/>}
      {shape === 'square' && <span style={{ width: 8, height: 8, borderRadius: 2, background: color }}/>}
      {shape === 'dash' && <span style={{ width: 10, height: 2, background: color }}/>}
      {shape === 'dot' && <span style={{ width: 6, height: 6, borderRadius: 999, border: `1px dashed ${color}` }}/>}
      <span>{label}</span>
    </div>
  );
}

function SpecNode({ node, spec, selected, hovered, onHover, onClick, onDoubleClick, onDragStart }) {
  return (
    <div
      className="wg-node"
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseDown={onDragStart}
      style={{
        position: 'absolute', left: node.x, top: node.y,
        width: node.w, height: node.h,
        background: 'var(--bg-1)',
        border: `1px solid ${selected ? 'var(--accent-human)' : hovered ? 'var(--line-strong)' : 'var(--line-2)'}`,
        borderLeft: `3px solid var(--accent-human)`,
        borderRadius: 'var(--r-3)',
        padding: '8px 10px',
        cursor: 'pointer',
        boxShadow: selected ? '0 0 0 3px oklch(from var(--accent-human) l c h / 0.15)' : 'var(--shadow-1)',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="spec" size={12}/>
        <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{spec.id}</span>
        <span style={{ fontSize: 12, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spec.title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--fg-2)', marginBottom: 2 }}>
            <span>Readiness</span>
            <span className="mono">{spec.readiness}</span>
          </div>
          <ProgressBar value={spec.readiness} color={spec.readiness >= 70 ? 'var(--signal-green)' : 'var(--signal-amber)'} height={3}/>
        </div>
        <Chip status={spec.readiness >= 70 ? 'passing' : 'flaky'} size="sm">{spec.status}</Chip>
      </div>
    </div>
  );
}

function TaskNode({ node, task, selected, hovered, onHover, onClick, onDragStart }) {
  const style = STATUS_STYLE[task.status] || STATUS_STYLE.in_flight;
  const owner = window.HUMANS.find(h => h.id === task.assignee);
  const agentMeta = task.delegated ? window.AGENTS.find(a => a.id === task.delegated) : null;
  const riskColor = { red: 'var(--signal-red)', amber: 'var(--signal-amber)', green: 'var(--signal-green)' }[task.risk];

  return (
    <div
      className="wg-node"
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
      onMouseDown={onDragStart}
      style={{
        position: 'absolute', left: node.x, top: node.y,
        width: node.w, height: node.h,
        background: style.bg,
        border: `1px ${style.dashed ? 'dashed' : 'solid'} ${selected ? 'var(--accent-human)' : hovered ? 'var(--line-strong)' : style.border}`,
        borderRadius: 'var(--r-2)',
        padding: '6px 8px',
        cursor: 'pointer',
        boxShadow: selected ? '0 0 0 3px oklch(from var(--accent-human) l c h / 0.12)' : 'none',
        display: 'flex', alignItems: 'center', gap: 8,
        opacity: task.status === 'done' ? 0.7 : 1,
      }}
    >
      <span style={{ width: 4, height: 4, borderRadius: 999, background: riskColor, flexShrink: 0 }}/>
      <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', flexShrink: 0 }}>{task.id}</span>
      <span style={{
        fontSize: 12, fontWeight: 500, color: style.fg,
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textDecoration: task.status === 'done' ? 'line-through' : 'none',
      }}>{task.title}</span>
      <div style={{ display: 'flex', gap: -4, alignItems: 'center' }}>
        {owner && <Avatar name={owner.name} kind="human" size={16}/>}
      </div>
    </div>
  );
}

function SessionNode({ node, sess, task, selected, hovered, onHover, onClick, onDragStart }) {
  const agent = window.AGENTS.find(a => a.id === sess.agent);
  const pct = Math.round((sess.contextUsed / sess.contextMax) * 100);
  const pulse = sess.status === 'active';

  return (
    <div
      className="wg-node"
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
      onMouseDown={onDragStart}
      style={{
        position: 'absolute', left: node.x, top: node.y,
        width: node.w, height: node.h,
        background: 'var(--bg-2)',
        border: `1px solid ${selected ? 'var(--accent-agent)' : hovered ? 'var(--accent-agent)' : 'var(--accent-agent)'}`,
        borderRadius: 'var(--r-1)',
        padding: '4px 6px',
        cursor: 'pointer',
        boxShadow: selected ? '0 0 0 3px oklch(from var(--accent-agent) l c h / 0.15)' : 'none',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {pulse && <span style={{
          width: 6, height: 6, borderRadius: 999, background: 'var(--accent-agent)',
          animation: 'pulse 1.2s ease-in-out infinite',
        }}/>}
        {!pulse && <Icon name={sess.status === 'awaiting_input' ? 'pause' : 'check'} size={10}/>}
        <span className="mono" style={{ fontSize: 9, color: 'var(--fg-1)', fontWeight: 600 }}>
          {agent?.name.replace(/^claude-|^codex-|^cursor-/, '')}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--fg-3)' }} className="mono">
        <span>{sess.elapsed}</span>
        <span>${sess.cost}</span>
      </div>
    </div>
  );
}

function Inspector({ selection, selectionKind, onOpenSpec }) {
  if (!selection) {
    return <div style={{ padding: 16, fontSize: 12, color: 'var(--fg-3)' }}>Select a node to inspect</div>;
  }
  if (selectionKind === 'spec') return <SpecInspector spec={selection} onOpen={onOpenSpec}/>;
  if (selectionKind === 'task') return <TaskInspector task={selection}/>;
  if (selectionKind === 'session') return <SessionInspector sess={selection}/>;
  return null;
}

function SpecInspector({ spec, onOpen }) {
  const acceptance = spec.acceptance || [];
  const passing = acceptance.filter(a => a.status === 'passing').length;
  const owner = window.HUMANS.find(h => h.id === spec.owner);
  const tasks = window.TASKS.filter(t => t.spec === spec.id);

  return (
    <div style={{ padding: 0 }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Icon name="spec" size={12}/>
          <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{spec.id}</span>
          <Chip status="human" size="sm">spec</Chip>
          <Chip status={spec.status === 'in_flight' ? 'active' : 'default'} size="sm">{spec.status}</Chip>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{spec.title}</div>
        <Button variant="secondary" size="sm" icon="arrow" onClick={() => onOpen && onOpen(spec.id)}>Open spec editor</Button>
      </div>

      {spec.intent && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-1)' }}>
          <SectionLabel>INTENT</SectionLabel>
          <div style={{ fontSize: 12, color: 'var(--fg-1)', lineHeight: 1.5 }}>{spec.intent}</div>
        </div>
      )}

      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-1)' }}>
        <SectionLabel>READINESS</SectionLabel>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <span className="mono" style={{ fontSize: 24, fontWeight: 600, color: spec.readiness >= 70 ? 'var(--signal-green)' : 'var(--signal-amber)' }}>{spec.readiness}</span>
          <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>/ 100 · threshold 70</span>
        </div>
        <ProgressBar value={spec.readiness} color={spec.readiness >= 70 ? 'var(--signal-green)' : 'var(--signal-amber)'} height={4}/>
      </div>

      {acceptance.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-1)' }}>
          <SectionLabel>ACCEPTANCE <span className="mono" style={{ color: 'var(--fg-3)' }}>{passing}/{acceptance.length}</span></SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {acceptance.map(ac => (
              <div key={ac.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <Chip status={ac.status} size="sm" sparkline={ac.spark}>{ac.status}</Chip>
                <span style={{ fontSize: 11, color: 'var(--fg-1)', flex: 1 }}>{ac.statement}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-1)' }}>
        <SectionLabel>CONTEXT BUNDLE</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
          <MiniMetric label="files"   value={spec.contextBundle?.files || '—'}/>
          <MiniMetric label="ADRs"    value={spec.contextBundle?.adrs || '—'}/>
          <MiniMetric label="skills"  value={spec.contextBundle?.skills || '—'}/>
          <MiniMetric label="MCP"     value={spec.contextBundle?.mcp || '—'}/>
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        <SectionLabel>TASKS <span className="mono" style={{ color: 'var(--fg-3)' }}>{tasks.length}</span></SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {tasks.map(t => {
            const h = window.HUMANS.find(x => x.id === t.assignee);
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 11 }}>
                <span className="mono" style={{ color: 'var(--fg-3)', width: 44 }}>{t.id}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                {h && <Avatar name={h.name} kind="human" size={14}/>}
                {t.delegated && <span style={{ width: 6, height: 6, borderRadius: 2, background: 'var(--accent-agent)' }}/>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TaskInspector({ task }) {
  const owner = window.HUMANS.find(h => h.id === task.assignee);
  const agent = task.delegated ? window.AGENTS.find(a => a.id === task.delegated) : null;
  return (
    <div>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{task.id}</span>
          <Chip status={task.status === 'blocked' ? 'failing' : 'default'} size="sm">{task.status.replace('_', ' ')}</Chip>
          <Chip status={`risk_${task.risk}`} size="sm">{task.risk}</Chip>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{task.title}</div>
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-1)' }}>
        <SectionLabel>ASSIGNMENT</SectionLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Avatar name={owner?.name || '?'} kind="human" size={22}/>
          <div>
            <div style={{ fontSize: 12 }}>{owner?.name}</div>
            <div style={{ fontSize: 10, color: 'var(--fg-3)' }}>{owner?.role} · accountable</div>
          </div>
        </div>
        {agent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name={agent.name} kind="agent" size={22}/>
            <div>
              <div className="mono" style={{ fontSize: 11 }}>{agent.name}</div>
              <div style={{ fontSize: 10, color: 'var(--fg-3)' }}>{agent.model} · delegated</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-1)' }}>
        <SectionLabel>PATHS</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {task.paths.map(p => (
            <span key={p} className="mono" style={{ fontSize: 11, color: 'var(--fg-1)' }}>{p}</span>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        <SectionLabel>ACTIONS</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Button variant="secondary" size="sm" icon="bolt">Delegate to agent</Button>
          <Button variant="ghost" size="sm" icon="link">Open PR</Button>
          <Button variant="ghost" size="sm" icon="graph">Reparent</Button>
        </div>
      </div>
    </div>
  );
}

function SessionInspector({ sess }) {
  const agent = window.AGENTS.find(a => a.id === sess.agent);
  const task = window.TASKS.find(t => t.id === sess.task);
  const ctxPct = Math.round((sess.contextUsed / sess.contextMax) * 100);

  return (
    <div>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Avatar name={agent.name} kind="agent" size={18}/>
          <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>{agent.name}</span>
          <Chip status={sess.status === 'active' ? 'passing' : sess.status === 'awaiting_input' ? 'flaky' : 'default'} size="sm">
            {sess.status.replace('_', ' ')}
          </Chip>
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-2)' }}>
          Working on <span className="mono" style={{ color: 'var(--fg-1)' }}>{task?.id}</span>  ·  <span>{task?.title}</span>
        </div>
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-1)' }}>
        <SectionLabel>TELEMETRY</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
          <MiniMetric label="elapsed" value={sess.elapsed}/>
          <MiniMetric label="cost" value={`$${sess.cost.toFixed(2)}`}/>
          <MiniMetric label="model" value={agent.model.split('-').slice(-2).join('-')}/>
          <MiniMetric label="context" value={`${ctxPct}%`}/>
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--fg-3)', marginBottom: 3 }}>Context budget</div>
          <ProgressBar value={sess.contextUsed} max={sess.contextMax} color={ctxPct > 80 ? 'var(--signal-amber)' : 'var(--accent-agent)'}/>
        </div>
      </div>

      {sess.activities && sess.activities.length > 0 && (
        <div style={{ padding: '12px 16px' }}>
          <SectionLabel>ACTIVITY <span className="mono" style={{ color: 'var(--fg-3)' }}>{sess.activities.length}</span></SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
            {sess.activities.slice(-6).map((a, i) => (
              <ActivityRow key={i} activity={a}/>
            ))}
          </div>
          <Button variant="ghost" size="sm" icon="arrow" style={{ marginTop: 8 }}>Open full run panel</Button>
        </div>
      )}
    </div>
  );
}

function ActivityRow({ activity }) {
  const kindMap = {
    read: { icon: 'spec', color: 'var(--fg-2)' },
    edit: { icon: 'bolt', color: 'var(--accent-agent)' },
    tool: { icon: 'flask', color: 'var(--fg-2)' },
    reason: { icon: 'sparkle', color: 'var(--accent-mixed)' },
    decision: { icon: 'decision', color: 'var(--accent-human)' },
    elicit: { icon: 'sparkle', color: 'var(--signal-amber)' },
  };
  const m = kindMap[activity.kind] || kindMap.read;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11 }}>
      <span className="mono" style={{ color: 'var(--fg-3)', fontSize: 9, width: 32, flexShrink: 0, paddingTop: 2 }}>{activity.t}</span>
      <span style={{ color: m.color, flexShrink: 0, paddingTop: 1 }}><Icon name={m.icon} size={11}/></span>
      <span className="mono" style={{ color: 'var(--fg-1)', lineHeight: 1.45 }}>{activity.text}</span>
    </div>
  );
}

const SectionLabel = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-3)', letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' }}>{children}</div>
);

const MiniMetric = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 10, color: 'var(--fg-3)', marginBottom: 2 }}>{label}</div>
    <div className="mono" style={{ fontSize: 12, color: 'var(--fg-0)', fontWeight: 500 }}>{value}</div>
  </div>
);

Object.assign(window, { WorkGraph });
