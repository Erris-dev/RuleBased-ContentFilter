import type { Database } from 'better-sqlite3';

import { rowToRule, type Rule, type RuleInput, type RuleRow } from './rule.model.js';

const SELECT_COLUMNS = `
  id, keyword, match_type, action_type, color, label,
  priority, is_enabled, case_sensitive, created_at, updated_at
`;

/** Priority desc then id asc — the order the API and UI both present rules in. */
const ORDER_BY = 'ORDER BY priority DESC, id ASC';

const toDbBool = (value: boolean | undefined, fallback: boolean): 0 | 1 =>
  (value ?? fallback) ? 1 : 0;

/**
 * All SQL for the rules table. Built as a factory over a connection so tests can
 * point it at an in-memory database.
 *
 * Statements are prepared once at construction rather than per call — with
 * better-sqlite3 that is where most of the performance comes from.
 */
export const createRulesRepository = (db: Database) => {
  const statements = {
    list: db.prepare<[], RuleRow>(`SELECT ${SELECT_COLUMNS} FROM rules ${ORDER_BY}`),

    listEnabled: db.prepare<[], RuleRow>(
      `SELECT ${SELECT_COLUMNS} FROM rules WHERE is_enabled = 1 ${ORDER_BY}`,
    ),

    count: db.prepare<[], { n: number }>('SELECT COUNT(*) AS n FROM rules'),

    findById: db.prepare<[number], RuleRow>(
      `SELECT ${SELECT_COLUMNS} FROM rules WHERE id = ?`,
    ),

    insert: db.prepare<
      {
        keyword: string;
        match_type: string;
        action_type: string;
        color: string | null;
        label: string | null;
        priority: number;
        is_enabled: 0 | 1;
        case_sensitive: 0 | 1;
      },
      RuleRow
    >(`
      INSERT INTO rules
        (keyword, match_type, action_type, color, label, priority, is_enabled, case_sensitive)
      VALUES
        (@keyword, @match_type, @action_type, @color, @label, @priority, @is_enabled, @case_sensitive)
      RETURNING ${SELECT_COLUMNS}
    `),

    update: db.prepare<{
      id: number;
      keyword: string;
      match_type: string;
      action_type: string;
      color: string | null;
      label: string | null;
      priority: number;
      is_enabled: 0 | 1;
      case_sensitive: 0 | 1;
    }>(`
      UPDATE rules SET
        keyword        = @keyword,
        match_type     = @match_type,
        action_type    = @action_type,
        color          = @color,
        label          = @label,
        priority       = @priority,
        is_enabled     = @is_enabled,
        case_sensitive = @case_sensitive
      WHERE id = @id
    `),

    setEnabled: db.prepare<[0 | 1, number]>('UPDATE rules SET is_enabled = ? WHERE id = ?'),

    remove: db.prepare<[number]>('DELETE FROM rules WHERE id = ?'),
  };

  const findById = (id: number): Rule | null => {
    const row = statements.findById.get(id);
    return row ? rowToRule(row) : null;
  };

  /**
   * Updates re-read the row instead of using `RETURNING`: SQLite evaluates
   * RETURNING before AFTER triggers fire, so the returned `updated_at` would
   * still be the old one. One extra indexed read by primary key is cheaper than
   * a stale timestamp reaching the client.
   */
  const reread = (id: number): Rule => {
    const rule = findById(id);
    if (!rule) throw new Error(`Rule ${id} vanished mid-write`);
    return rule;
  };

  const create = (input: RuleInput): Rule => {
    const row = statements.insert.get({
      keyword: input.keyword.trim(),
      match_type: input.matchType,
      action_type: input.actionType,
      // Only the field its action type uses is persisted, so a rule switched
      // from highlight to tooltip cannot leave a stale colour behind.
      color: input.actionType === 'highlight' ? (input.color ?? null) : null,
      label: input.actionType === 'tooltip' ? (input.label ?? null) : null,
      priority: input.priority ?? 0,
      is_enabled: toDbBool(input.isEnabled, true),
      case_sensitive: toDbBool(input.caseSensitive, false),
    });

    if (!row) throw new Error('Insert did not return a row');
    return rowToRule(row);
  };

  /** Only the field its action type uses is persisted, on update as on insert. */
  const update = (id: number, input: RuleInput): Rule | null => {
    const result = statements.update.run({
      id,
      keyword: input.keyword.trim(),
      match_type: input.matchType,
      action_type: input.actionType,
      color: input.actionType === 'highlight' ? (input.color ?? null) : null,
      label: input.actionType === 'tooltip' ? (input.label ?? null) : null,
      priority: input.priority ?? 0,
      is_enabled: toDbBool(input.isEnabled, true),
      case_sensitive: toDbBool(input.caseSensitive, false),
    });

    return result.changes === 0 ? null : reread(id);
  };

  const setEnabled = (id: number, isEnabled: boolean): Rule | null => {
    const result = statements.setEnabled.run(isEnabled ? 1 : 0, id);
    return result.changes === 0 ? null : reread(id);
  };

  return {
    list: (): Rule[] => statements.list.all().map(rowToRule),

    findById,

    /** Used by text processing — disabled rules must not participate. */
    listEnabled: (): Rule[] => statements.listEnabled.all().map(rowToRule),

    count: (): number => statements.count.get()?.n ?? 0,

    create,

    /** Inserts many rules in one transaction — all land, or none do. */
    createMany: db.transaction((inputs: readonly RuleInput[]): Rule[] => inputs.map(create)),

    /** Full replacement (PUT). Returns null when the id does not exist. */
    update,

    /** The enable/disable toggle (PATCH). Returns null when the id does not exist. */
    setEnabled,

    /** Returns false when the id did not exist, so the caller can 404. */
    remove: (id: number): boolean => statements.remove.run(id).changes > 0,
  };
};

export type RulesRepository = ReturnType<typeof createRulesRepository>;
