import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AgentIdentity, Spec, Task, User, Workspace, WorkspaceId, SpecId, TaskId } from './zod.js';

const fixturesDir = resolve(__dirname, '../../../fixtures');
const workspaceFixture = JSON.parse(readFileSync(resolve(fixturesDir, 'workspace.json'), 'utf8'));
const specsFixture = JSON.parse(readFileSync(resolve(fixturesDir, 'specs-and-tasks.json'), 'utf8'));

describe('branded id parsers', () => {
  it('accepts well-formed ids', () => {
    expect(WorkspaceId.parse('ws_meridian')).toBe('ws_meridian');
    expect(SpecId.parse('spec_s142')).toBe('spec_s142');
    expect(TaskId.parse('task_t511')).toBe('task_t511');
  });

  it('rejects prefix mismatches', () => {
    expect(() => WorkspaceId.parse('spec_s142')).toThrow();
    expect(() => SpecId.parse('ws_meridian')).toThrow();
  });

  it('rejects empty suffix', () => {
    expect(() => WorkspaceId.parse('ws_')).toThrow();
  });
});

describe('Workspace fixture round-trip', () => {
  it('parses the seeded workspace', () => {
    const result = Workspace.safeParse(workspaceFixture.workspace);
    expect(result.success, JSON.stringify(result)).toBe(true);
  });

  it('parses every seeded user', () => {
    for (const user of workspaceFixture.users) {
      const result = User.safeParse(user);
      expect(result.success, JSON.stringify(result)).toBe(true);
    }
  });

  it('parses every seeded agent identity', () => {
    for (const agent of workspaceFixture.agents) {
      const result = AgentIdentity.safeParse(agent);
      expect(result.success, JSON.stringify(result)).toBe(true);
    }
  });
});

describe('Spec + Task fixtures round-trip', () => {
  it('parses every seeded spec', () => {
    for (const spec of specsFixture.specs) {
      const result = Spec.safeParse(spec);
      expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    }
  });

  it('parses every seeded task', () => {
    for (const task of specsFixture.tasks) {
      const result = Task.safeParse(task);
      expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    }
  });
});

describe('Spec readiness invariants', () => {
  it('reports the fixture spec as ungated (readiness 92, threshold 70)', () => {
    const spec = Spec.parse(specsFixture.specs[0]);
    expect(spec.readiness_score).toBe(92);
    expect(spec.readiness_breakdown.threshold).toBe(70);
    expect(spec.readiness_breakdown.gated).toBe(false);
  });
});
