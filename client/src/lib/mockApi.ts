/**
 * TEMPORARY — in-browser stand-in for the API (phases 3 and 5).
 *
 * Implements the exact contract from plan §7 so that swapping to `fetch` is a
 * change to `api.ts` alone and nothing above it moves. Rules persist in
 * localStorage so a refresh behaves like a real backend would.
 *
 * Delete this file once the server endpoints exist.
 */

import { processText } from '@/lib/matcher';
import { ruleInputSchema, toFieldErrors } from '@/lib/validation';
import type { ProcessResult, Rule, RuleInput } from '@/types';

const STORAGE_KEY = 'rules';

/** Matches the server's error shape so error handling does not change later. */
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

/** The brief's example rules, mirroring server/src/models/rule.examples.ts. */
export const EXAMPLE_RULES: readonly RuleInput[] = [
  { keyword: 'urgent', matchType: 'contains', actionType: 'highlight', color: '#ef4444', priority: 20 },
  { keyword: 'meeting', matchType: 'contains', actionType: 'highlight', color: '#3b82f6', priority: 10 },
  { keyword: 'deadline', matchType: 'contains', actionType: 'tooltip', label: 'IMPORTANT', priority: 0 },
] as const;

export const EXAMPLE_TEXT =
  'The meeting with the finance team is tomorrow. The deadline is urgent.';

const read = (): Rule[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Rule[]) : [];
  } catch {
    return [];
  }
};

const write = (rules: Rule[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch {
    /* private mode — rules stay for this session only */
  }
};

const nextId = (rules: Rule[]): number => rules.reduce((max, r) => Math.max(max, r.id), 0) + 1;

/** Priority desc, id asc — the order the API returns and the UI presents. */
const sorted = (rules: Rule[]): Rule[] =>
  [...rules].sort((a, b) => b.priority - a.priority || a.id - b.id);

/** Small delay on writes so optimistic updates and pending states are real. */
const settle = <T,>(value: T, ms = 90): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

const validate = (input: RuleInput): RuleInput => {
  const result = ruleInputSchema.safeParse(input);
  if (!result.success) {
    throw new ApiError(400, 'Validation failed', toFieldErrors(result.error));
  }
  return result.data as RuleInput;
};

const materialise = (input: RuleInput, id: number, createdAt?: string): Rule => {
  const now = new Date().toISOString();
  return {
    id,
    keyword: input.keyword.trim(),
    matchType: input.matchType,
    actionType: input.actionType,
    // Only the field its action type uses is stored, so switching a rule from
    // highlight to tooltip cannot leave a stale colour behind.
    color: input.actionType === 'highlight' ? (input.color ?? null) : null,
    label: input.actionType === 'tooltip' ? (input.label?.trim() ?? null) : null,
    priority: input.priority ?? 0,
    isEnabled: input.isEnabled ?? true,
    caseSensitive: input.caseSensitive ?? false,
    createdAt: createdAt ?? now,
    updatedAt: now,
  };
};

export const mockApi = {
  listRules: async (): Promise<Rule[]> => settle(sorted(read()), 40),

  createRule: async (input: RuleInput): Promise<Rule> => {
    const clean = validate(input);
    const rules = read();
    const rule = materialise(clean, nextId(rules));
    write([...rules, rule]);
    return settle(rule);
  },

  createMany: async (inputs: readonly RuleInput[]): Promise<Rule[]> => {
    const rules = read();
    let id = nextId(rules);
    const created = inputs.map((input) => materialise(validate(input), id++));
    write([...rules, ...created]);
    return settle(created);
  },

  updateRule: async (id: number, input: RuleInput): Promise<Rule> => {
    const clean = validate(input);
    const rules = read();
    const existing = rules.find((r) => r.id === id);
    if (!existing) throw new ApiError(404, 'Rule not found');

    const updated = materialise(clean, id, existing.createdAt);
    write(rules.map((r) => (r.id === id ? updated : r)));
    return settle(updated);
  },

  setEnabled: async (id: number, isEnabled: boolean): Promise<Rule> => {
    const rules = read();
    const existing = rules.find((r) => r.id === id);
    if (!existing) throw new ApiError(404, 'Rule not found');

    const updated = { ...existing, isEnabled, updatedAt: new Date().toISOString() };
    write(rules.map((r) => (r.id === id ? updated : r)));
    return settle(updated, 40);
  },

  deleteRule: async (id: number): Promise<void> => {
    const rules = read();
    if (!rules.some((r) => r.id === id)) throw new ApiError(404, 'Rule not found');
    write(rules.filter((r) => r.id !== id));
    return settle(undefined);
  },

  /**
   * Reads rules from storage rather than trusting a caller-supplied list, the
   * same way the real endpoint reads them from the database.
   */
  processText: async (text: string, draftRule?: Rule | null): Promise<ProcessResult> =>
    settle(processText(text, sorted(read()), draftRule), 0),
};
