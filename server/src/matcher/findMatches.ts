/**
 * Stage one of the matching engine (plan §6.1): locate every span a rule matches.
 *
 * Pure functions only — no Express, no SQL. `Rule` is imported for its type
 * alone, so nothing in the data layer is pulled in at runtime and the tests can
 * call these functions with plain objects.
 */

import type { Rule } from '../models/rule.model.js';
import type { Match } from './types.js';

/**
 * What counts as part of a word. Apostrophes are included so "don't" stays one
 * word; hyphens are not, so "well-known" is two.
 */
const WORD_CHAR = /[\p{L}\p{N}_'’]/u;

const isWordChar = (char: string | undefined): boolean =>
  char !== undefined && WORD_CHAR.test(char);

/**
 * Finds every span of `text` that `rule` matches.
 *
 * Matching is word-oriented, because the brief says "words matching rules should
 * be highlighted": a hit is located by the keyword, then expanded to cover the
 * whole word containing it. So `contains "dead"` highlights all of "deadline",
 * not the first four characters of it.
 *
 * `startsWith` means *a word starts with the keyword*, not *the text does* — see
 * the assumption noted in plan §6.1 and in the README.
 */
export const findMatches = (text: string, rule: Rule): Match[] => {
  const keyword = rule.keyword.trim();
  if (!keyword || !text) return [];

  const haystack = rule.caseSensitive ? text : text.toLowerCase();
  const needle = rule.caseSensitive ? keyword : keyword.toLowerCase();

  const matches: Match[] = [];
  const seen = new Set<string>();

  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) break;
    from = at + 1; // +1, not +needle.length, so overlapping occurrences are seen

    const end = at + needle.length;
    const startsWord = !isWordChar(text[at - 1]);
    const endsWord = !isWordChar(text[end]);

    const qualifies =
      rule.matchType === 'exact'
        ? startsWord && endsWord
        : rule.matchType === 'startsWith'
          ? startsWord
          : true;

    if (!qualifies) continue;

    // Expand to the full word(s) so the whole matched word is marked.
    let spanStart = at;
    let spanEnd = end;
    while (isWordChar(text[spanStart - 1])) spanStart -= 1;
    while (isWordChar(text[spanEnd])) spanEnd += 1;

    // Two occurrences inside one word expand to the same span; keep one.
    const key = `${spanStart}:${spanEnd}`;
    if (seen.has(key)) continue;
    seen.add(key);

    matches.push({ ruleId: rule.id, start: spanStart, end: spanEnd });
  }

  return matches;
};
