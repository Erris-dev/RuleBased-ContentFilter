/**
 * Stage three of the matching engine: run every enabled rule over the text and
 * assemble the response payload (plan §6.4).
 */

import type { Rule } from '../models/rule.model.js';
import { findMatches } from './findMatches.js';
import { resolveSegments } from './resolveSegments.js';
import type { Match, ProcessResult, RuleMatchSummary } from './types.js';

/**
 * Runs every enabled rule against the text.
 *
 * `draftRule` is the unsaved rule being edited in the form; it participates in
 * matching but is flagged so the UI can render it as a preview (plan §8.5).
 */
export const processText = (
  text: string,
  rules: Rule[],
  draftRule?: Rule | null,
): ProcessResult => {
  const active = rules.filter((rule) => rule.isEnabled);

  if (draftRule) {
    // When the draft carries an existing id the user is editing that rule, so it
    // replaces the saved version — otherwise the preview would show the old and
    // new rule matching at once.
    const index = active.findIndex((rule) => rule.id === draftRule.id);
    if (index === -1) active.push(draftRule);
    else active[index] = draftRule;
  }

  const rulesById = new Map(active.map((rule) => [rule.id, rule]));

  const matchesByRule = new Map<number, Match[]>();
  const allMatches: Match[] = [];

  for (const rule of active) {
    const found = findMatches(text, rule);
    matchesByRule.set(rule.id, found);
    allMatches.push(...found);
  }

  const summary: RuleMatchSummary[] = active.map((rule) => ({
    ruleId: rule.id,
    keyword: rule.keyword,
    matchCount: matchesByRule.get(rule.id)?.length ?? 0,
  }));

  return { segments: resolveSegments(text, allMatches, rulesById), summary };
};
