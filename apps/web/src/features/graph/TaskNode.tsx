import type { Task } from '@atlas/schema';
import { Handle, Position, type NodeProps } from '@xyflow/react';

type TaskNodeData = {
  task: Task;
  onOpen?: () => void;
};

const RISK_BG: Record<string, string> = {
  green: 'var(--signal-green)',
  amber: 'var(--signal-amber)',
  red: 'var(--signal-red)',
};

export function TaskNode({ data }: NodeProps) {
  const { task, onOpen } = data as TaskNodeData;
  return (
    <button
      data-testid={`graph-task-${task.id}`}
      onClick={onOpen}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: 'var(--s-2) var(--s-3)',
        background: 'var(--bg-1)',
        border: '1px solid var(--line-1)',
        borderRadius: 'var(--r-2)',
        minWidth: 180,
        maxWidth: 200,
        textAlign: 'left',
        cursor: 'pointer',
        color: 'var(--fg-0)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: RISK_BG[task.risk],
            flexShrink: 0,
          }}
        />
        <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>
          {task.id}
        </span>
      </div>
      <div style={{ fontSize: 'var(--fs-12)', color: 'var(--fg-1)' }}>{task.title}</div>
      <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>
        {task.status}
      </div>
      <Handle type="target" position={Position.Left} style={{ background: 'var(--line-2)' }} />
      <Handle type="source" position={Position.Right} style={{ background: 'var(--line-2)' }} />
    </button>
  );
}
