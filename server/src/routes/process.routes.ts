import { Router } from 'express';

import { createProcessController } from '../controllers/index.js';
import type { ProcessService } from '../services/index.js';

/** Path-to-handler wiring for `/api/process`. */
export const createProcessRouter = (service: ProcessService): Router => {
  const controller = createProcessController(service);
  const router = Router();

  router.post('/', controller.process);

  return router;
};
