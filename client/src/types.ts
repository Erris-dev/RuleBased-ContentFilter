/** Mirrors the server's domain types (plan §7). */

export const MATCH_TYPES = ['contains', 'startsWith', 'exact'] as const;
export type MatchType = (typeof MATCH_TYPES)[number];

export const ACTION_TYPES = ['highlight', 'tooltip'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export interface Rule {
  id: number;
  keyword: string;
  matchType: MatchType;
  actionType: ActionType;
  color: string | null;
  label: string | null;
  priority: number;
  isEnabled: boolean;
  caseSensitive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RuleInput {
  keyword: string;
  matchType: MatchType;
  actionType: ActionType;
  color?: string | null;
  label?: string | null;
  priority?: number;
  isEnabled?: boolean;
  caseSensitive?: boolean;
}

/**
 * One run of text sharing an identical set of matched rules. Segments are
 * non-overlapping, gap-free, and concatenate back to exactly the input.
 */
export interface Segment {
  text: string;
  /** Every rule matching this span, including ones that lost the highlight. */
  rules: number[];
  /** Winning highlight colour, or null. */
  highlight: string | null;
  /** All tooltip labels covering this span, highest priority first. */
  labels: string[];
  /** True while this comes from an unsaved draft rule (plan §8.5). */
  isDraft?: boolean;
}

export interface RuleMatchSummary {
  ruleId: number;
  keyword: string;
  matchCount: number;
}

export interface ProcessResult {
  segments: Segment[];
  summary: RuleMatchSummary[];
}

/** Human-readable labels for the match types. */
export const MATCH_TYPE_LABELS: Record<MatchType, string> = {
  contains: 'contains',
  startsWith: 'starts with',
  exact: 'exact match',
};

export const MATCH_TYPE_HINTS: Record<MatchType, string> = {
  contains: 'Matches any word containing the keyword — "dead" finds "deadline".',
  startsWith: 'Matches any word beginning with the keyword — "dead" finds "deadline", not "undead".',
  exact: 'Matches the whole word only — "dead" will not find "deadline".',
};
