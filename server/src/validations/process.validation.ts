import { z } from 'zod';

import { draftRuleSchema } from './rule.validation.js';

/**
 * Body of `POST /process`.
 *
 * The cap on `text` is a denial-of-service guard, not a product limit: matching
 * is linear in the text length per rule, but a request is still a request. It
 * sits well above any plausible paste (plan §6.5).
 */
export const processRequestSchema = z.object({
  text: z.string().max(100_000, 'Text is too long to process in one request'),
  draftRule: draftRuleSchema.nullish(),
});

export type ProcessRequestBody = z.infer<typeof processRequestSchema>;
