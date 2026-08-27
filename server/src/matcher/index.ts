/**
 * The matching engine (plan §6). Three stages: locate matches, resolve overlaps
 * into flat segments, summarise.
 *
 * Nothing in here imports Express or better-sqlite3, which is what keeps the
 * suite in `tests/matcher.test.ts` a set of plain function calls with no HTTP
 * harness and no fixture database.
 */

export { findMatches } from './findMatches.js';
export { DRAFT_RULE_ID, resolveSegments } from './resolveSegments.js';
export { processText } from './processText.js';
export type { Match, ProcessResult, RuleMatchSummary, Segment } from './types.js';
