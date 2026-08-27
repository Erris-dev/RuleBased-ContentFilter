/**
 * Barrel for the data layer. Controllers and services import from here rather
 * than reaching into individual files.
 */
export { EXAMPLE_RULES, EXAMPLE_TEXT } from './rule.examples.js';
export {
  ACTION_TYPES,
  MATCH_TYPES,
  rowToRule,
  type ActionType,
  type MatchType,
  type Rule,
  type RuleInput,
  type RuleRow,
} from './rule.model.js';
export { createRulesRepository, type RulesRepository } from './rule.repository.js';
