import type { Request, Response } from 'express';

import type { ErrorBody } from '../errors/index.js';

/** Mounted after all routes: anything unmatched gets the standard error shape. */
export const notFoundHandler = (req: Request, res: Response<ErrorBody>): void => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
};
