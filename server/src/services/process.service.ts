import { DRAFT_RULE_ID, processText, type ProcessResult } from '../matcher/index.js';
import type { Rule, RulesRepository } from '../models/index.js';
import type { DraftRuleBody } from '../validations/index.js';

/**
 * Turns a validated draft into a `Rule` the matcher can run.
 *
 * Nothing here is persisted — the draft exists for one request. It borrows the
 * id of the rule being edited when there is one, so the preview replaces that
 * rule instead of matching alongside it (plan §8.5).
 */
const toRule = (draft: DraftRuleBody): Rule => ({
  id: draft.id ?? DRAFT_RULE_ID,
  keyword: draft.keyword,
  matchType: draft.matchType,
  actionType: draft.actionType,
  color: draft.actionType === 'highlight' ? (draft.color ?? null) : null,
  label: draft.actionType === 'tooltip' ? (draft.label ?? null) : null,
  priority: draft.priority ?? 0,
  isEnabled: true,
  caseSensitive: draft.caseSensitive ?? false,
  createdAt: '',
  updatedAt: '',
});

/**
 * Text processing (plan §7).
 *
 * Rules are read from the database here rather than accepted from the client:
 * the brief specifies that the backend processes the text, and trusting a
 * client-supplied rule list would mean the output no longer reflects what is
 * actually stored.
 */
export const createProcessService = (rules: RulesRepository) => ({
  process: (text: string, draftRule?: DraftRuleBody | null): ProcessResult =>
    processText(text, rules.listEnabled(), draftRule ? toRule(draftRule) : null),
});

export type ProcessService = ReturnType<typeof createProcessService>;
