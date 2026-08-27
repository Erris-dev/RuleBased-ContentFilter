/**
 * The single seam between the UI and the backend.
 *
 * Everything above this file works in terms of these functions, so replacing the
 * mock with real `fetch` calls in phase 5 touches this file only.
 */

import { ApiError, EXAMPLE_RULES, EXAMPLE_TEXT, mockApi } from '@/lib/mockApi';
import type { ProcessResult, Rule, RuleInput } from '@/types';

export { ApiError, EXAMPLE_RULES, EXAMPLE_TEXT };

export const api = {
  /** GET /api/rules */
  listRules: (): Promise<Rule[]> => mockApi.listRules(),

  /** POST /api/rules */
  createRule: (input: RuleInput): Promise<Rule> => mockApi.createRule(input),

  /** POST /api/rules (batched) — backs the "Load example rules" action. */
  createMany: (inputs: readonly RuleInput[]): Promise<Rule[]> => mockApi.createMany(inputs),

  /** PUT /api/rules/:id */
  updateRule: (id: number, input: RuleInput): Promise<Rule> => mockApi.updateRule(id, input),

  /** PATCH /api/rules/:id */
  setEnabled: (id: number, isEnabled: boolean): Promise<Rule> => mockApi.setEnabled(id, isEnabled),

  /** DELETE /api/rules/:id */
  deleteRule: (id: number): Promise<void> => mockApi.deleteRule(id),

  /** POST /api/process — `draftRule` previews an unsaved rule (plan §8.5). */
  processText: (text: string, draftRule?: Rule | null): Promise<ProcessResult> =>
    mockApi.processText(text, draftRule),
};
