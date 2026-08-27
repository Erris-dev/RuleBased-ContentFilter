/**
 * Types produced by the matching engine.
 *
 * They live beside the matcher rather than in `models/` because they describe a
 * *result*, not a stored entity — nothing here is ever written to the database.
 * The client mirrors them in its own `types.ts` (plan §6.4).
 */

/** One located hit, before overlaps are resolved. Character offsets into the input. */
export interface Match {
  ruleId: number;
  start: number;
  end: number;
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
