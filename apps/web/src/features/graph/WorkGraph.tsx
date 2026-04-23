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
    return <div style={{ color: 'var(--fg-2)', padding: 'var(--s-6)' }}>Loading graph…</div>;
  }
  if (specs.length === 0) {
    return (
      <div data-testid="graph-empty" style={{ color: 'var(--fg-3)', padding: 'var(--s-6)' }}>
        No specs in this workspace yet.
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
      }}
    >
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
