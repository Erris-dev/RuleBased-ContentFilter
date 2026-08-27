import type { Request, Response } from 'express';

import type { RulesService } from '../services/index.js';
import { ruleIdSchema, ruleInputSchema, toggleSchema } from '../validations/index.js';

/**
 * HTTP for the rule endpoints: parse the request, pick the status code, hand off.
 *
 * No domain logic and no SQL live here. Validation failures and `ApiError`s are
 * thrown rather than handled — Express routes them to the error middleware,
 * which owns the one error shape the API returns.
 */
export const createRulesController = (service: RulesService) => ({
  list: (_req: Request, res: Response): void => {
    res.json(service.list());
  },

  create: (req: Request, res: Response): void => {
    const input = ruleInputSchema.parse(req.body);
    res.status(201).json(service.create(input));
  },

  createExamples: (_req: Request, res: Response): void => {
    res.status(201).json(service.createExamples());
  },

  update: (req: Request, res: Response): void => {
    const id = ruleIdSchema.parse(req.params.id);
    const input = ruleInputSchema.parse(req.body);
    res.json(service.update(id, input));
  },

  toggle: (req: Request, res: Response): void => {
    const id = ruleIdSchema.parse(req.params.id);
    const { isEnabled } = toggleSchema.parse(req.body);
    res.json(service.setEnabled(id, isEnabled));
  },

  remove: (req: Request, res: Response): void => {
    const id = ruleIdSchema.parse(req.params.id);
    service.remove(id);
    res.status(204).end();
  },
});
