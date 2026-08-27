import { z } from 'zod';

import { ACTION_TYPES, MATCH_TYPES } from '@/types';

/**
 * The rule contract. Mirrors what the server will enforce in `validations/`, so
 * the form and the API agree on what a valid rule is and the user never gets a
 * surprise 400 for something the form accepted.
 */
export const ruleInputSchema = z
  .object({
    keyword: z
      .string()
      .trim()
      .min(1, 'Enter a keyword to match')
      .max(100, 'Keep the keyword under 100 characters'),
    matchType: z.enum(MATCH_TYPES),
    actionType: z.enum(ACTION_TYPES),
    color: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i, 'Pick a colour')
      .nullable()
      .optional(),
    label: z.string().trim().max(40, 'Keep the label under 40 characters').nullable().optional(),
    priority: z.number().int().min(0).max(999).optional(),
    isEnabled: z.boolean().optional(),
    caseSensitive: z.boolean().optional(),
  })
  // A highlight rule needs a colour and a tooltip rule needs a label. Expressed
  // as refinements so the message lands on the offending field.
  .refine((rule) => rule.actionType !== 'highlight' || Boolean(rule.color), {
    message: 'Choose a highlight colour',
    path: ['color'],
  })
  .refine((rule) => rule.actionType !== 'tooltip' || Boolean(rule.label?.trim()), {
    message: 'Enter a label to show on hover',
    path: ['label'],
  });

export type RuleInputSchema = z.infer<typeof ruleInputSchema>;

/** Flattens a Zod error into `{ field: message }` for inline display. */
export const toFieldErrors = (error: z.ZodError): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    result[key] ??= issue.message;
  }
  return result;
};
