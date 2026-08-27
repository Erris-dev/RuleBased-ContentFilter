/**
 * The single seam between the UI and the backend.
 *
 * Everything above this file works in terms of these functions rather than in
 * terms of `fetch`, which is what let the whole UI be built and demoed against
 * an in-browser mock before the endpoints existed — swapping the mock for the
 * real API changed this file and nothing above it.
 *
 * Requests are origin-relative: Vite proxies /api to the server in development,
 * so there is no base URL to configure and CORS never comes into play.
 */

import { EXAMPLE_TEXT } from '@/lib/examples';
import type { ProcessResult, Rule, RuleInput } from '@/types';

export { EXAMPLE_TEXT };

/** Mirrors the server's error body: `{ error, details? }` (plan §7). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorBody {
  error?: string;
  details?: Record<string, string>;
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let response: globalThis.Response;

  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    });
  } catch {
    // A dead server is the one failure with no HTTP status to report.
    throw new ApiError(0, 'Could not reach the server');
  }

  if (response.status === 204) return undefined as T;

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const { error, details } = (body ?? {}) as ErrorBody;
    throw new ApiError(response.status, error ?? 'Something went wrong', details);
  }

  return body as T;
};

const send = <T>(method: string, path: string, body?: unknown): Promise<T> =>
  request<T>(path, { method, body: JSON.stringify(body ?? {}) });

export const api = {
  /** GET /api/rules */
  listRules: (): Promise<Rule[]> => request<Rule[]>('/rules'),

  /** POST /api/rules */
  createRule: (input: RuleInput): Promise<Rule> => send<Rule>('POST', '/rules', input),

  /**
   * POST /api/rules/examples — backs the "Load example rules" action.
   *
   * The rules themselves live on the server so the button and the API cannot
   * drift apart (plan §5).
   */
  createExamples: (): Promise<Rule[]> => send<Rule[]>('POST', '/rules/examples'),

  /** PUT /api/rules/:id */
  updateRule: (id: number, input: RuleInput): Promise<Rule> =>
    send<Rule>('PUT', `/rules/${id}`, input),

  /** PATCH /api/rules/:id */
  setEnabled: (id: number, isEnabled: boolean): Promise<Rule> =>
    send<Rule>('PATCH', `/rules/${id}`, { isEnabled }),

  /** DELETE /api/rules/:id */
  deleteRule: (id: number): Promise<void> => send<void>('DELETE', `/rules/${id}`),

  /** POST /api/process — `draftRule` previews an unsaved rule (plan §8.5). */
  processText: (text: string, draftRule?: Rule | null): Promise<ProcessResult> =>
    send<ProcessResult>('POST', '/process', { text, draftRule: draftRule ?? null }),
};
