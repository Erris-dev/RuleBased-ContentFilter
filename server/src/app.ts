import cors from 'cors';
import express, { type Express } from 'express';

import { config } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/index.js';

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
 * Routers are constructed with their dependencies here rather than importing a
 * shared singleton, which is what keeps controllers and services testable.
 */
export const createApp = (): Express => {
  const app = express();

  app.use(cors({ origin: config.clientOrigins }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
  });

  // Routers mount here:
  //   app.use('/api/rules', createRulesRouter(rulesService));       — phase 3
  //   app.use('/api/process', createProcessRouter(processService)); — phase 5

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
