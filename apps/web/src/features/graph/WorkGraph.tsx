import { useEffect, useMemo, useState } from 'react';
import type { Spec, Task } from '@atlas/schema';
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { listSpecs, listTasks } from '../../lib/api.js';
import { useHelp } from '../../help/store.js';
import { SpecNode } from './SpecNode.js';
import { TaskNode } from './TaskNode.js';
import { TimeScrubber } from './TimeScrubber.js';

interface Props {
  onOpenSpec: (id: string) => void;
  onOpenTask?: (id: string) => void;
}

const nodeTypes: NodeTypes = {
  spec: SpecNode,
  task: TaskNode,
};

// Layout: spec nodes in a column on the left, their tasks fanned out to
// the right in rows. Phase 2 is static layout; drag adjusts positions in
// local react-flow state only (not persisted).
const LAYOUT = {
  specX: 40,
  specGapY: 220,
  taskStartX: 360,
  taskGapX: 220,
  taskGapY: 90,
};

export function WorkGraph({ onOpenSpec, onOpenTask }: Props) {
  const [specs, setSpecs] = useState<Spec[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cutoff, setCutoff] = useState<Date | null>(null); // null = "now", no filter
  const openHelp = useHelp((s) => s.open);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listSpecs(), listTasks()])
      .then(([s, t]) => {
        if (cancelled) return;
        setSpecs(s.items);
        setTasks(t.items);
      })
      .catch((e: Error) => !cancelled && setErr(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const { nodes, edges } = useMemo(() => {
    if (!specs || !tasks) return { nodes: [] as Node[], edges: [] as Edge[] };

    const cutoffMs = cutoff?.getTime();
    const visibleTasks = cutoffMs
      ? tasks.filter((t) => new Date(t.created_at).getTime() <= cutoffMs)
      : tasks;
    const visibleTaskIds = new Set(visibleTasks.map((t) => t.id));

    const tasksBySpec = new Map<string, Task[]>();
    for (const t of visibleTasks) {
      const list = tasksBySpec.get(t.parent_spec) ?? [];
      list.push(t);
      tasksBySpec.set(t.parent_spec, list);
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    specs.forEach((spec, specIdx) => {
      const y = specIdx * LAYOUT.specGapY;
      nodes.push({
        id: spec.id,
        type: 'spec',
        position: { x: LAYOUT.specX, y },
        data: { spec, onOpen: () => onOpenSpec(spec.id) },
        draggable: true,
      });

      const taskList = tasksBySpec.get(spec.id) ?? [];
      taskList.forEach((t, taskIdx) => {
        const col = taskIdx % 3;
        const row = Math.floor(taskIdx / 3);
        nodes.push({
          id: t.id,
          type: 'task',
          position: {
            x: LAYOUT.taskStartX + col * LAYOUT.taskGapX,
            y: y + row * LAYOUT.taskGapY,
          },
          data: { task: t, onOpen: () => onOpenTask?.(t.id) },
          draggable: true,
        });

        // Edge from spec -> task.
        edges.push({
          id: `${spec.id}-${t.id}`,
          source: spec.id,
          target: t.id,
          style: { stroke: 'var(--line-2)', strokeWidth: 1 },
          markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--line-2)' },
        });
      });
    });

    // blocks / blocked_by edges between tasks.
    for (const t of visibleTasks) {
      for (const blockedBy of t.blocked_by) {
        if (!visibleTaskIds.has(blockedBy)) continue;
        edges.push({
          id: `block-${blockedBy}-${t.id}`,
          source: blockedBy,
          target: t.id,
          style: { stroke: 'var(--signal-amber)', strokeDasharray: '4 4' },
          markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--signal-amber)' },
          label: 'blocks',
          labelStyle: { fill: 'var(--fg-3)', fontSize: 10, fontFamily: 'var(--font-mono)' },
        });
      }
    }

    return { nodes, edges };
  }, [specs, tasks, cutoff, onOpenSpec, onOpenTask]);

  if (err) {
    return (
      <div data-testid="graph-error" style={{ color: 'var(--signal-red)', padding: 'var(--s-6)' }}>
        {err}
      </div>
    );
  }
  if (!specs || !tasks) {
    return (
      <div
        data-testid="graph-loading"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 'var(--s-2)',
          color: 'var(--fg-2)',
        }}
      >
        <span>Loading the work graph…</span>
        <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>
          specs + tasks from /v1/specs + /v1/tasks
        </span>
      </div>
    );
  }
  if (specs.length === 0) {
    return (
      <div
        data-testid="graph-empty"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 'var(--s-3)',
          color: 'var(--fg-1)',
          maxWidth: 520,
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 'var(--fs-24)', color: 'var(--fg-0)', fontWeight: 600 }}>
          Atlas is empty.
        </div>
        <p style={{ color: 'var(--fg-2)', lineHeight: 'var(--lh-prose)', margin: 0 }}>
          The work graph renders every spec in the workspace with its tasks branching off, plus the
          dependency edges between them. There are no specs yet. Load the Meridian demo workspace
          with <code style={inlineCode}>make seed</code> or create your first spec from the API.
        </p>
        <button
          onClick={() => openHelp('your-first-spec')}
          style={{
            marginTop: 'var(--s-3)',
            padding: '6px 14px',
            background: 'var(--accent-human)',
            color: 'var(--bg-0)',
            border: 'none',
            borderRadius: 'var(--r-2)',
            cursor: 'pointer',
            fontSize: 'var(--fs-12)',
            fontWeight: 600,
          }}
        >
          Walk me through my first spec
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="work-graph"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-inset)',
        borderRadius: 'var(--r-3)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        data-testid="work-graph-orient"
        style={{
          position: 'absolute',
          top: 'var(--s-3)',
          left: 'var(--s-4)',
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--s-2)',
          fontSize: 'var(--fs-11)',
          color: 'var(--fg-3)',
          background: 'var(--bg-1)',
          border: '1px solid var(--line-1)',
          borderRadius: 'var(--r-pill)',
          padding: '4px 10px',
        }}
      >
        <span className="mono" style={{ fontSize: 10 }}>
          {specs.length} spec · {tasks.length} tasks
        </span>
        <span style={{ color: 'var(--line-2)' }}>·</span>
        <button
          onClick={() => openHelp('reading-work-graph')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--accent-human)',
            cursor: 'pointer',
            fontSize: 'var(--fs-11)',
            padding: 0,
          }}
        >
          What am I looking at?
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: 'smoothstep' }}
        >
          <Background gap={24} color="var(--line-1)" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <TimeScrubber tasks={tasks} value={cutoff} onChange={setCutoff} />
    </div>
  );
}

const inlineCode: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.92em',
  padding: '1px 5px',
  background: 'var(--bg-2)',
  border: '1px solid var(--line-1)',
  borderRadius: 'var(--r-1)',
};
