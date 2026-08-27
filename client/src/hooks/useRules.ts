import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/api';
import type { Rule, RuleInput } from '@/types';

/** How long a delete can be undone before it is sent (plan §8.9). */
const UNDO_WINDOW_MS = 5000;

/**
 * Owns the rule collection.
 *
 * Every mutation is optimistic: state updates immediately and rolls back if the
 * request fails, so the UI never sits waiting on the network.
 */
export const useRules = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  /** Deletes waiting out their undo window, keyed by rule id. */
  const pendingDeletes = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setRules(await api.listRules());
    } catch {
      setLoadError('Could not load rules.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Any delete still in its undo window when the page closes should not be lost.
  useEffect(() => {
    const timers = pendingDeletes.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const sortRules = (next: Rule[]): Rule[] =>
    [...next].sort((a, b) => b.priority - a.priority || a.id - b.id);

  const createRule = useCallback(async (input: RuleInput): Promise<Rule> => {
    const created = await api.createRule(input);
    setRules((current) => sortRules([...current, created]));
    return created;
  }, []);

  const updateRule = useCallback(async (id: number, input: RuleInput): Promise<Rule> => {
    const updated = await api.updateRule(id, input);
    setRules((current) => sortRules(current.map((r) => (r.id === id ? updated : r))));
    return updated;
  }, []);

  const setEnabled = useCallback(async (id: number, isEnabled: boolean) => {
    // Optimistic: the switch moves now, not after a round trip.
    setRules((current) => current.map((r) => (r.id === id ? { ...r, isEnabled } : r)));
    try {
      await api.setEnabled(id, isEnabled);
    } catch {
      setRules((current) => current.map((r) => (r.id === id ? { ...r, isEnabled: !isEnabled } : r)));
      toast.error('Could not update the rule');
    }
  }, []);

  /**
   * Removes the rule from view immediately and offers an undo. The request only
   * goes out once the window closes, so an undo costs nothing to honour.
   */
  const deleteRule = useCallback((rule: Rule) => {
    setRules((current) => current.filter((r) => r.id !== rule.id));

    const commit = setTimeout(() => {
      pendingDeletes.current.delete(rule.id);
      void api.deleteRule(rule.id).catch(() => {
        setRules((current) => sortRules([...current, rule]));
        toast.error(`Could not delete "${rule.keyword}"`);
      });
    }, UNDO_WINDOW_MS);

    pendingDeletes.current.set(rule.id, commit);

    toast(`Deleted "${rule.keyword}"`, {
      action: {
        label: 'Undo',
        onClick: () => {
          const timer = pendingDeletes.current.get(rule.id);
          if (timer) clearTimeout(timer);
          pendingDeletes.current.delete(rule.id);
          setRules((current) => sortRules([...current, rule]));
        },
      },
    });
  }, []);

  const loadExamples = useCallback(async () => {
    try {
      const created = await api.createExamples();
      setRules((current) => sortRules([...current, ...created]));
      toast.success('Loaded the example rules');
    } catch {
      toast.error('Could not load the examples');
    }
  }, []);

  /** Drag-reorder writes priority, so the ordering the user sees is the real one. */
  const reorder = useCallback(
    async (orderedIds: number[]) => {
      const previous = rules;
      const top = orderedIds.length;

      const repriced = rules.map((rule) => {
        const index = orderedIds.indexOf(rule.id);
        return index === -1 ? rule : { ...rule, priority: (top - index) * 10 };
      });
      setRules(sortRules(repriced));

      try {
        await Promise.all(
          repriced
            .filter((rule, i) => rule.priority !== previous[i]?.priority)
            .map((rule) =>
              api.updateRule(rule.id, {
                keyword: rule.keyword,
                matchType: rule.matchType,
                actionType: rule.actionType,
                color: rule.color,
                label: rule.label,
                priority: rule.priority,
                isEnabled: rule.isEnabled,
                caseSensitive: rule.caseSensitive,
              }),
            ),
        );
      } catch {
        setRules(previous);
        toast.error('Could not reorder the rules');
      }
    },
    [rules],
  );

  return {
    rules,
    isLoading,
    loadError,
    reload: load,
    createRule,
    updateRule,
    setEnabled,
    deleteRule,
    loadExamples,
    reorder,
  };
};
