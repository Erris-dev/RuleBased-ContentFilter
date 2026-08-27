import { ApiError } from '../errors/index.js';
import { EXAMPLE_RULES, type Rule, type RuleInput, type RulesRepository } from '../models/index.js';

/**
 * Domain rules for the rule collection.
 *
 * This layer exists so controllers stay about HTTP and repositories stay about
 * SQL. Concretely, it is where "no row matched" becomes a 404 — the repository
 * reports absence as `null`, because absence is not an error at that level, and
 * the controller should not be deciding status codes from return values.
 */
export const createRulesService = (rules: RulesRepository) => {
  const requireRule = <T>(result: T | null): T => {
    if (result === null) throw ApiError.notFound('Rule');
    return result;
  };

  return {
    list: (): Rule[] => rules.list(),

    create: (input: RuleInput): Rule => rules.create(input),

    /**
     * Seeds the brief's example rules (plan §5). The definition lives on the
     * server so the "Load example rules" button and the API cannot disagree —
     * there is one path into the database, not a UI copy and a seed script.
     */
    createExamples: (): Rule[] => rules.createMany(EXAMPLE_RULES),

    update: (id: number, input: RuleInput): Rule => requireRule(rules.update(id, input)),

    setEnabled: (id: number, isEnabled: boolean): Rule =>
      requireRule(rules.setEnabled(id, isEnabled)),

    remove: (id: number): void => {
      if (!rules.remove(id)) throw ApiError.notFound('Rule');
    },
  };
};

export type RulesService = ReturnType<typeof createRulesService>;
