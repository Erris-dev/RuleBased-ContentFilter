/**
 * tsc only emits .ts output, so schema.sql has to be copied into dist/ for the
 * built server to find it next to connection.js. Keeping the schema as a real .sql file
 * (rather than a string in a .ts module) is worth this one build step: it stays
 * readable, and editors syntax-highlight it.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = join(import.meta.dirname, '..');
const from = join(root, 'src', 'database', 'schema.sql');
const to = join(root, 'dist', 'database', 'schema.sql');

mkdirSync(dirname(to), { recursive: true });
copyFileSync(from, to);

console.log('copied schema.sql -> dist/database/');
