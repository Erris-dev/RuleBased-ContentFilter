import type { Database } from 'better-sqlite3';
import cors from 'cors';
import express, { type Express } from 'express';

import { config } from './config.js';
import { getDb } from './database/index.js';
import { errorHandler, notFoundHandler } from './middleware/index.js';
import { createRulesRepository } from './models/index.js';
import { createApiRouter } from './routes/index.js';

/**
 * Composition root. Builds the Express app without starting it, so tests can
 * mount it directly against an in-memory database.
 *
 * Wiring order matters and is the one thing to preserve when adding a router:
 *   1. platform middleware (cors, body parsing)
 *   2. feature routers under /api
 *   3. notFoundHandler  — only reached if nothing above matched
 *   4. errorHandler     — must be last; Express selects it by its 4-arg signature
 *
 * The database arrives as an argument rather than being imported deeper in the
 * stack, which is what keeps controllers and services testable.
 */
export const createApp = (db: Database = getDb()): Express => {
  const app = express();

  app.use(cors({ origin: config.clientOrigins }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', createApiRouter(createRulesRepository(db)));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
