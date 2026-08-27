/**
 * The Rule entity: its shape, its allowed values, and the mapping between the
 * database row and the API representation.
 *
 * Deliberately free of persistence — the SQL lives next door in
 * `rule.repository.ts` rather than as methods on the entity. An ActiveRecord-style
 * model that knew how to save itself would pull better-sqlite3 into everything
 * importing a `Rule`, including the matching engine, which is kept free of both
 * Express and SQL so it can be tested as plain functions (plan §4.1).
 *
 * The client mirrors these types in its own `types.ts`.
 */

export const MATCH_TYPES = ['contains', 'startsWith', 'exact'] as const;
export type MatchType = (typeof MATCH_TYPES)[number];

export const ACTION_TYPES = ['highlight', 'tooltip'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

/** A rule as the API exposes it: camelCase, real booleans. */
export interface Rule {
  id: number;
  keyword: string;
  matchType: MatchType;
  actionType: ActionType;
  /** Set when actionType is 'highlight'. */
  color: string | null;
  /** Set when actionType is 'tooltip'. */
  label: string | null;
  priority: number;
  isEnabled: boolean;
  caseSensitive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A rule as SQLite stores it: snake_case, 0/1 for booleans. */
export interface RuleRow {
  id: number;
  keyword: string;
  match_type: MatchType;
  action_type: ActionType;
  color: string | null;
  label: string | null;
  priority: number;
  is_enabled: number;
  case_sensitive: number;
  created_at: string;
  updated_at: string;
}

/**
 * The single conversion point between storage and API shapes. Keeping it in one
 * place means the snake_case/0-1 representation never leaks past the repository.
 */
export const rowToRule = (row: RuleRow): Rule => ({
  id: row.id,
  keyword: row.keyword,
  matchType: row.match_type,
  actionType: row.action_type,
  color: row.color,
  label: row.label,
  priority: row.priority,
  isEnabled: row.is_enabled === 1,
  caseSensitive: row.case_sensitive === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Fields accepted when creating or replacing a rule. */
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
