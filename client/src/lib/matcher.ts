/**
 * The matching engine (plan §6).
 *
 * Pure functions only — no React, no network, no storage. This is written to be
 * moved verbatim into `server/src/matcher/` when the API lands in phase 4; it
 * lives here for now so the UI has real behaviour to render.
 *
 * Three stages: locate matches, resolve overlaps into flat segments, summarise.
 */

import type { ProcessResult, Rule, RuleMatchSummary, Segment } from '@/types';

/** Id used for the unsaved rule being previewed in the form (plan §8.5). */
export const DRAFT_RULE_ID = -1;

/**
 * What counts as part of a word. Apostrophes are included so "don't" stays one
 * word; hyphens are not, so "well-known" is two.
 */
const WORD_CHAR = /[\p{L}\p{N}_'’]/u;

const isWordChar = (char: string | undefined): boolean =>
  char !== undefined && WORD_CHAR.test(char);

export interface Match {
  ruleId: number;
  start: number;
  end: number;
}

/**
 * Finds every span of `text` that `rule` matches.
 *
 * Matching is word-oriented, because the brief says "words matching rules should
 * be highlighted": a hit is located by the keyword, then expanded to cover the
 * whole word containing it. So `contains "dead"` highlights all of "deadline",
 * not the first four characters of it.
 *
 * `startsWith` means *a word starts with the keyword*, not *the text does* — see
 * the assumption noted in plan §6.1.
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

/**
 * Collapses overlapping matches into a flat, gap-free sequence of segments via a
 * sweep line over every match boundary (plan §6.3).
 *
 * Guarantees: segments are non-overlapping, cover the whole input, and
 * concatenate back to exactly `text`.
 */
export const resolveSegments = (
  text: string,
  matches: Match[],
  rulesById: Map<number, Rule>,
): Segment[] => {
  if (!text) return [];
  if (matches.length === 0) {
    return [{ text, rules: [], highlight: null, labels: [] }];
  }

  // 1. Every boundary becomes a cut point.
  const cuts = new Set<number>([0, text.length]);
  for (const match of matches) {
    cuts.add(match.start);
    cuts.add(match.end);
  }
  const points = [...cuts].sort((a, b) => a - b);

  // 2. Each consecutive pair is a candidate segment.
  const raw: Segment[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i]!;
    const end = points[i + 1]!;
    if (start >= end) continue;

    // 3. Which rules cover this whole interval?
    const covering = matches
      .filter((m) => m.start <= start && m.end >= end)
      .map((m) => rulesById.get(m.ruleId))
      .filter((rule): rule is Rule => rule !== undefined);

    raw.push(buildSegment(text.slice(start, end), covering));
  }

  return mergeAdjacent(raw);
};

/** Reduces the rules covering one span to what should actually be rendered. */
const buildSegment = (text: string, covering: Rule[]): Segment => {
  if (covering.length === 0) {
    return { text, rules: [], highlight: null, labels: [] };
  }

  // Highest priority first; ties broken by id so the result is deterministic.
  const byPriority = [...covering].sort((a, b) => b.priority - a.priority || a.id - b.id);

  // Only one background colour can render, so the top-priority highlight wins.
  const winner = byPriority.find((rule) => rule.actionType === 'highlight');

  // Tooltip labels stack — a span can legitimately carry several.
  const labels = byPriority
    .filter((rule) => rule.actionType === 'tooltip' && rule.label)
    .map((rule) => rule.label as string);

  const segment: Segment = {
    text,
    // Every contributing rule, including highlight rules that lost, so the UI
    // can name them all on hover.
    rules: byPriority.map((rule) => rule.id),
    highlight: winner?.color ?? null,
    labels,
  };

  if (byPriority.some((rule) => rule.id === DRAFT_RULE_ID)) segment.isDraft = true;

  return segment;
};

/**
 * A cut point introduced by one match splits runs belonging to another. Merging
 * neighbours with identical rule sets keeps the output minimal, which matters
 * because each segment becomes a DOM node.
 */
const mergeAdjacent = (segments: Segment[]): Segment[] => {
  const merged: Segment[] = [];

  for (const segment of segments) {
    const previous = merged[merged.length - 1];
    const sameRules =
      previous !== undefined &&
      previous.rules.length === segment.rules.length &&
      previous.rules.every((id, index) => id === segment.rules[index]);

    if (sameRules) {
      previous.text += segment.text;
    } else {
      merged.push({ ...segment });
    }
  }

  return merged;
};

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
