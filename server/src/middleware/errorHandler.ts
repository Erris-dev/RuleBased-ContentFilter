import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { ApiError, type ErrorBody } from '../errors/index.js';

/** Flattens a Zod error into `{ fieldName: "message" }` for inline form display. */
const toFieldErrors = (error: ZodError): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    // First message per field wins — the form shows one message per input.
    result[key] ??= issue.message;
  }
  return result;
};

/**
 * The last middleware in the stack. Every error the API returns is shaped here,
 * so no route hand-rolls its own.
 *
 * Express 5 forwards rejected promises here automatically, which is why route
 * handlers can be plain `async` functions with no wrapper.
 *
 * Express identifies error middleware by arity — all four parameters must stay
 * in the signature even though `next` is unused.
 */
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response<ErrorBody>,
  _next: NextFunction,
): void => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: toFieldErrors(err) });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  // Anything reaching here is unexpected: log it, but never leak internals.
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Internal server error' });
};
