/**
 * Stage two of the matching engine (plan §6.3): collapse overlapping matches
 * into a flat, gap-free sequence of segments.
 */

import type { Rule } from '../models/rule.model.js';
import type { Match, Segment } from './types.js';

/** Id used for an unsaved rule being previewed in the form (plan §8.5). */
export const DRAFT_RULE_ID = -1;

/**
 * Sweep line over every match boundary.
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
