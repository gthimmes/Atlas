// Typed HTTP client for the Atlas API. Thin wrapper over fetch; we'll
// move to TanStack Query for caching in Phase 2 once we have more than
// one surface consuming a given resource.

import type { ReadinessBreakdown, Spec, Task } from '@atlas/schema';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string; retryable?: boolean };
    };
    throw new ApiError(
      res.status,
      body.error?.code ?? 'E_UNKNOWN',
      body.error?.message ?? res.statusText,
      body.error?.retryable ?? false,
    );
  }
  return (await res.json()) as T;
}

export async function getSpec(id: string): Promise<Spec> {
  return request<Spec>(`/v1/specs/${id}`);
}

export async function listSpecs(query?: {
  project?: string;
  status?: string;
}): Promise<{ items: Spec[]; next_cursor: string | null }> {
  const params = new URLSearchParams();
  if (query?.project) params.set('project', query.project);
  if (query?.status) params.set('status', query.status);
  const suffix = params.size ? `?${params.toString()}` : '';
  return request(`/v1/specs${suffix}`);
}

export async function listTasks(query?: {
  spec?: string;
  status?: string;
}): Promise<{ items: Task[]; next_cursor: string | null }> {
  const params = new URLSearchParams();
  if (query?.spec) params.set('spec', query.spec);
  if (query?.status) params.set('status', query.status);
  const suffix = params.size ? `?${params.toString()}` : '';
  return request(`/v1/tasks${suffix}`);
}

export type SpecSection =
  | 'intent'
  | 'non_goals'
  | 'constraints'
  | 'acceptance'
  | 'decisions'
  | 'open_questions'
  | 'context_bundle';

export async function proposeSpecEdit(
  spec: string,
  section: SpecSection,
  patch: Record<string, unknown>,
): Promise<Spec> {
  return request<Spec>('/v1/tools/spec.propose_edit', {
    method: 'POST',
    body: JSON.stringify({ spec, section, patch }),
  });
}

export async function getReadiness(id: string): Promise<ReadinessBreakdown> {
  return request<ReadinessBreakdown>(`/v1/specs/${id}/readiness`);
}
