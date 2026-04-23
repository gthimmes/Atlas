import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { emitCSharp } from './emit.js';
import { parseSchema } from './parse.js';

const schemaPath = resolve(__dirname, '../../../schema.ts');

describe('schema codegen', () => {
  const parsed = parseSchema(schemaPath);
  const output = emitCSharp(parsed.models);

  it('finds every branded ID declared in schema.ts', () => {
    const brandNames = parsed.models.filter((m) => m.kind === 'brandedId').map((m) => m.name);
    expect(brandNames).toEqual(
      expect.arrayContaining([
        'WorkspaceId',
        'ProjectId',
        'UserId',
        'AgentId',
        'SpecId',
        'TaskId',
        'SessionId',
        'PitchId',
        'AcceptanceId',
        'AdrId',
        'BundleId',
        'EvidenceId',
        'ElicitId',
        'ActivityId',
      ]),
    );
  });

  it('finds every expected enum', () => {
    const enumNames = parsed.models.filter((m) => m.kind === 'enum').map((m) => m.name);
    expect(enumNames).toEqual(
      expect.arrayContaining([
        'SpecStatus',
        'TaskStatus',
        'SessionStatus',
        'AcceptanceStatus',
        'AcceptanceType',
        'AdrStatus',
        'PitchStatus',
        'RiskLevel',
        'TrustTier',
        'ActorKind',
        'Severity',
      ]),
    );
  });

  it('finds the 11 primitive records', () => {
    const recordNames = new Set(
      parsed.models.filter((m) => m.kind === 'record').map((m) => m.name),
    );
    for (const primitive of [
      'Spec',
      'AcceptanceCriterion',
      'Task',
      'AgentSession',
      'VerificationEvidence',
      'ContextBundle',
      'Pitch',
      'Adr',
      'GraphEdge',
      'Constitution',
      'LivingArtifactView',
    ]) {
      expect(recordNames.has(primitive)).toBe(true);
    }
  });

  it('emits a header, namespace, and records', () => {
    expect(output).toContain('namespace Atlas.Schema;');
    expect(output).toContain('public enum SpecStatus');
    expect(output).toContain(
      'public readonly record struct WorkspaceId(string Value) : IBrandedId',
    );
    expect(output).toContain('public sealed record Spec(');
  });

  it('maps nullable TS types with a trailing ?', () => {
    // Spec.pitch: PitchId | null → should become PitchId?
    expect(output).toMatch(/PitchId\? Pitch/);
  });

  it('maps TS arrays to IReadOnlyList<T>', () => {
    // Spec.non_goals: string[]
    expect(output).toMatch(/IReadOnlyList<string> NonGoals/);
  });

  it('produces only ASCII + common punctuation in the emit', () => {
    // Guard against accidental smart quotes / em-dashes leaking into C# source.
    const badChars = output.match(/[^\x00-\x7F]/g);
    expect(badChars).toBeNull();
  });
});
