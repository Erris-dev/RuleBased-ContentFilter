import type { RuleInput } from './rule.model.js';

/**
 * The example scenario from the assignment brief.
 *
 * Not yet wired up: this feeds the "Load example rules" button (plan §8.9), which
 * lands with the rule UI in phase 7. It lives on the server so the button and the
 * API agree on one definition rather than the client carrying its own copy.
 *
 * Deliberately exactly the brief's three rules and nothing more -- adding a
 * fourth would change what the example sentence renders as, and reproducing the
 * brief's expected output exactly is a definition-of-done item.
 */
export const EXAMPLE_RULES: readonly RuleInput[] = [
  {
    keyword: 'urgent',
    matchType: 'contains',
    actionType: 'highlight',
    color: '#ef4444', // red
    priority: 20,
  },
  {
    keyword: 'meeting',
    matchType: 'contains',
    actionType: 'highlight',
    color: '#3b82f6', // blue
    priority: 10,
  },
  {
    keyword: 'deadline',
    matchType: 'contains',
    actionType: 'tooltip',
    label: 'IMPORTANT',
    priority: 0,
  },
] as const;

/** The brief's sample input, used as the textarea's starting content. */
export const EXAMPLE_TEXT =
  'The meeting with the finance team is tomorrow. The deadline is urgent.';
