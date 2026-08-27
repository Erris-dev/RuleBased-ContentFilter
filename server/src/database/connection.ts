import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

import { config } from '../config.js';

/**
 * schema.sql sits beside this file in both src/ and dist/ (the build copies it),
 * so the same lookup works under `tsx` and after compilation.
 */
const SCHEMA_FILE = path.join(import.meta.dirname, 'schema.sql');

/**
 * `config.databaseFile` is relative to the server workspace root. This file lives
 * at src/database/ (or dist/database/), hence two levels up.
 */
export const resolveDatabasePath = (file = config.databaseFile): string =>
  file === ':memory:' ? file : path.resolve(import.meta.dirname, '..', '..', file);

/**
 * Opens a connection and brings it up to schema.
 *
 * Exported as a factory rather than only a singleton so tests can run against an
 * isolated `:memory:` database — each test gets a clean schema with no fixture
 * teardown to forget.
 */
export const createDatabase = (file: string = resolveDatabasePath()): Database.Database => {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }

  const db = new Database(file);

  // WAL lets reads proceed during a write, which matters once the UI processes
  // text on every keystroke while a rule is being saved.
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(fs.readFileSync(SCHEMA_FILE, 'utf8'));

  return db;
};

let instance: Database.Database | undefined;

/** The application-wide connection, opened lazily on first use. */
export const getDb = (): Database.Database => {
  instance ??= createDatabase();
  return instance;
};

export const closeDb = (): void => {
  instance?.close();
  instance = undefined;
};
