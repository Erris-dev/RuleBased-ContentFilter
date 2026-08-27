import { Router } from 'express';

import type { RulesRepository } from '../models/index.js';
import { createProcessService, createRulesService } from '../services/index.js';
import { createProcessRouter } from './process.routes.js';
import { createRulesRouter } from './rules.routes.js';

/**
 * Everything the API serves under `/api`.
 *
 * Services are constructed here from the one repository the caller passes in,
 * rather than each module importing a shared singleton — that is what lets a
 * test mount the whole API against an in-memory database.
 */
export const createApiRouter = (rules: RulesRepository): Router => {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
  });

  router.use('/rules', createRulesRouter(createRulesService(rules)));
  router.use('/process', createProcessRouter(createProcessService(rules)));

  return router;
};
