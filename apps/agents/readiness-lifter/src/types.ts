// Structural types for the slices of the Atlas contract this agent touches.
// Kept local and minimal: the agent treats the workspace as a remote system
// of record, exactly like a third-party MCP client would.

export interface ReadinessComponent {
  score: number;
  max: number;
  notes: string[];
}

export interface ReadinessBreakdown {
  components: {
    acceptance_structure: ReadinessComponent;
    non_goals_present: ReadinessComponent;
    constraints_specific: ReadinessComponent;
    open_questions: ReadinessComponent;
    context_bundle: ReadinessComponent;
  };
  threshold: number;
  gated: boolean;
  score: number;
}

export interface Spec {
  id: string;
  title: string;
  intent: string | null;
  non_goals: string[];
  constraints: unknown[];
  acceptance: unknown[];
  open_questions: unknown[];
  readiness_breakdown: ReadinessBreakdown;
}

/** Spec sections this agent knows how to draft, mapped from their readiness component. */
export type DraftableSection = 'non_goals' | 'constraints' | 'acceptance';

export interface SectionPatch {
  section: DraftableSection;
  patch: Record<string, unknown>;
  rationale: string;
}

export type Drafter = (section: DraftableSection, spec: Spec) => Promise<SectionPatch>;
