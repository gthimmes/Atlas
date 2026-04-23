import type { Spec } from '@atlas/schema';
import { Handle, Position, type NodeProps } from '@xyflow/react';

type SpecNodeData = {
  spec: Spec;
  onOpen: () => void;
};

export function SpecNode({ data }: NodeProps) {
  const { spec, onOpen } = data as SpecNodeData;
  const gated = spec.readiness_breakdown.gated;
  return (
    <button
      data-testid={`graph-spec-${spec.id}`}
      onClick={onOpen}
      style={{
        textAlign: 'left',
        minWidth: 280,
        padding: 'var(--s-3) var(--s-4)',
        background: 'var(--bg-1)',
        border: `1px solid ${gated ? 'var(--signal-amber)' : 'var(--line-2)'}`,
        borderRadius: 'var(--r-3)',
        color: 'var(--fg-0)',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-1)',
      }}
    >
      <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>
        {spec.id} · {spec.status}
      </div>
      <div style={{ fontSize: 'var(--fs-14)', fontWeight: 600, marginTop: 4 }}>{spec.title}</div>
      <div style={{ display: 'flex', gap: 'var(--s-2)', marginTop: 6, alignItems: 'center' }}>
        <span
          className="mono"
          style={{
            padding: '1px 7px',
            borderRadius: 'var(--r-pill)',
            background: gated ? 'var(--signal-amber)' : 'var(--signal-green)',
            color: 'var(--bg-0)',
            fontSize: 10,
          }}
        >
          {spec.readiness_score}/100
        </span>
        <span className="mono" style={{ color: 'var(--fg-3)', fontSize: 10 }}>
          v{spec.version}
        </span>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: 'var(--line-2)' }} />
    </button>
  );
}
