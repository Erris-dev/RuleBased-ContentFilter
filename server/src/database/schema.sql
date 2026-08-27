-- Schema for the rule-based content filter.
--
-- Executed on every boot; every statement is IF NOT EXISTS so it is safe to
-- re-run. The assignment mandates Id, Keyword, MatchType and ActionType; the
-- remaining columns are the brief's "you may add additional fields if needed".

CREATE TABLE IF NOT EXISTS rules (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,

  -- The text to look for. Trimmed and non-empty.
  keyword        TEXT    NOT NULL CHECK (length(trim(keyword)) > 0),

  match_type     TEXT    NOT NULL CHECK (match_type IN ('contains', 'startsWith', 'exact')),
  action_type    TEXT    NOT NULL CHECK (action_type IN ('highlight', 'tooltip')),

  -- Exactly one of these is meaningful, decided by action_type (see CHECK below).
  color          TEXT,
  label          TEXT,

  -- Higher priority wins when two highlight rules cover the same span.
  priority       INTEGER NOT NULL DEFAULT 0,

  -- SQLite has no BOOLEAN type; 0/1 with a CHECK is the idiomatic stand-in.
  is_enabled     INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
  case_sensitive INTEGER NOT NULL DEFAULT 0 CHECK (case_sensitive IN (0, 1)),

  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  -- A highlight rule needs a colour; a tooltip rule needs a label. Enforced in
  -- Zod as well, so the API can return a readable message instead of surfacing
  -- a raw constraint violation -- but kept here so the data cannot go bad even
  -- if something writes to the database directly.
  CHECK (
    (action_type = 'highlight' AND color IS NOT NULL) OR
    (action_type = 'tooltip'   AND label IS NOT NULL)
  )
);

-- Supports the only hot query: enabled rules in priority order, read on every
-- text-processing request.
CREATE INDEX IF NOT EXISTS idx_rules_enabled_priority
  ON rules (is_enabled, priority DESC, id ASC);

-- Keeps updated_at honest without every caller having to remember it.
CREATE TRIGGER IF NOT EXISTS trg_rules_updated_at
AFTER UPDATE ON rules
FOR EACH ROW
BEGIN
  UPDATE rules SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = OLD.id;
END;
