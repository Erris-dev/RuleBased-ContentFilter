import type { Request, Response } from 'express';

import type { ProcessService } from '../services/index.js';
import { processRequestSchema } from '../validations/index.js';

/** HTTP for `POST /process`. Validates the body, returns segments and summary. */
export const createProcessController = (service: ProcessService) => ({
  process: (req: Request, res: Response): void => {
    const { text, draftRule } = processRequestSchema.parse(req.body);
    res.json(service.process(text, draftRule));
  },
});
