import { z } from 'zod';

import { ACTION_TYPES, MATCH_TYPES, type ActionType } from '../models/rule.model.js';

/**
 * The rule contract, enforced at the API edge.
 *
 * Mirrors `client/src/lib/validation.ts` field for field — same limits, same
 * messages — so the form never accepts something the API rejects, and a request
 * made outside the UI still gets a readable field-level 400 rather than a raw
 * SQLite constraint violation.
 */
const ruleFields = z.object({
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
});

interface ActionPayload {
  actionType: ActionType;
  color?: string | null;
  label?: string | null;
}

/**
 * A highlight rule needs a colour and a tooltip rule needs a label.
 *
 * Checked here rather than in the field definitions because the requirement is
 * conditional on another field; `path` puts the message on the input the user
 * has to fix. The same rule is a CHECK constraint in the schema, so the data
 * cannot go bad even if something writes to the database directly.
 */
const checkActionPayload = (rule: ActionPayload, ctx: z.RefinementCtx): void => {
  if (rule.actionType === 'highlight' && !rule.color) {
    ctx.addIssue({ code: 'custom', message: 'Choose a highlight colour', path: ['color'] });
  }
  if (rule.actionType === 'tooltip' && !rule.label?.trim()) {
    ctx.addIssue({ code: 'custom', message: 'Enter a label to show on hover', path: ['label'] });
  }
};

/** Body of `POST /rules` and `PUT /rules/:id`. */
export const ruleInputSchema = ruleFields.superRefine(checkActionPayload);

/**
 * The unsaved rule sent with a live preview (plan §8.5). Same shape as a rule
 * input plus the id of the rule being edited, so the preview *replaces* the
 * saved version instead of matching alongside it.
 */
export const draftRuleSchema = ruleFields
  .extend({
    id: z.number().int().optional(),
    /**
     * A draft outranks every saved rule so the rule being authored is always
     * visible in the preview, which puts it above the 999 ceiling a stored rule
     * is held to.
     */
    priority: z.number().int().min(0).max(9999).optional(),
  })
  .superRefine(checkActionPayload);

/** Body of `PATCH /rules/:id` — the enable/disable toggle. */
export const toggleSchema = z.object({ isEnabled: z.boolean() });

/** `:id` arrives as a string; everything below this line expects a number. */
export const ruleIdSchema = z.coerce
  .number({ message: 'Rule id must be a number' })
  .int('Rule id must be a whole number')
  .positive('Rule id must be positive');

export type RuleInputBody = z.infer<typeof ruleInputSchema>;
export type DraftRuleBody = z.infer<typeof draftRuleSchema>;
