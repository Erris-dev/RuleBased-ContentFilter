import { createContext, use, useMemo, useState } from 'react';

interface HoveredRuleValue {
  hoveredId: number | null;
  setHoveredId: (id: number | null) => void;
}

const HoveredRuleContext = createContext<HoveredRuleValue>({
  hoveredId: null,
  setHoveredId: () => {},
});

/**
 * One piece of state shared by both panels, so hovering a rule can light up its
 * matches and hovering a match can light up its rule (plan §8.6). Context rather
 * than prop drilling because the two ends sit far apart in the tree.
 */
export const useHoveredRuleState = (): HoveredRuleValue => {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  return useMemo(() => ({ hoveredId, setHoveredId }), [hoveredId]);
};

export const useHoveredRule = (): HoveredRuleValue => use(HoveredRuleContext);

export const HoveredRuleProvider = HoveredRuleContext.Provider;
