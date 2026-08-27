import { Router } from 'express';

import { createRulesController } from '../controllers/index.js';
import type { RulesService } from '../services/index.js';

/**
 * Path-to-handler wiring for `/api/rules`. No logic — if something here needs an
 * `if`, it belongs in the controller or the service.
 */
export const createRulesRouter = (service: RulesService): Router => {
  const controller = createRulesController(service);
  const router = Router();

  router.get('/', controller.list);
  router.post('/', controller.create);

  // A fixed path, so it can never be read as `/:id`.
  router.post('/examples', controller.createExamples);

  router.put('/:id', controller.update);
  router.patch('/:id', controller.toggle);
  router.delete('/:id', controller.remove);

  return router;
};
