import { motion } from 'motion/react';

import { useHoveredRule } from '@/hooks/useHoveredRule';
import { cn } from '@/lib/cn';
import { tint } from '@/lib/colors';
import type { Rule, RuleMatchSummary } from '@/types';

/**
 * The brief's "visual indicators for matched rules" (R10): a legend of which
 * rules fired and how often. It also carries the accessibility load — it names
 * every rule in text, so the colours are never the only way to tell them apart.
 */
export function MatchSummary({
  summary,
  rulesById,
}: {
  summary: RuleMatchSummary[];
  rulesById: Map<number, Rule>;
}) {
  const { hoveredId, setHoveredId } = useHoveredRule();

  const matched = summary.filter((entry) => entry.matchCount > 0);
  const total = matched.reduce((sum, entry) => sum + entry.matchCount, 0);

  if (summary.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="text-muted-foreground text-xs" aria-live="polite">
        <motion.span
          key={matched.length}
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-foreground font-medium"
        >
          {matched.length}
        </motion.span>{' '}
        of {summary.length} rules matched
        {total > 0 && (
          <>
            {' · '}
            <motion.span key={total} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {total}
            </motion.span>{' '}
            {total === 1 ? 'match' : 'matches'}
          </>
        )}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {matched.map((entry) => {
          const rule = rulesById.get(entry.ruleId);
          if (!rule) return null;

          const isHovered = hoveredId === entry.ruleId;
          const accent = rule.color ?? undefined;

          return (
            <button
              key={entry.ruleId}
              type="button"
              onMouseEnter={() => setHoveredId(entry.ruleId)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(entry.ruleId)}
              onBlur={() => setHoveredId(null)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]',
                'transition-all duration-(--duration-fast)',
                isHovered ? 'border-ring/60 scale-105' : 'border-border',
                hoveredId !== null && !isHovered && 'opacity-50',
              )}
              style={isHovered && accent ? { backgroundColor: tint(accent, 0.14) } : undefined}
            >
              {rule.actionType === 'highlight' && rule.color ? (
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: rule.color }}
                />
              ) : (
                <span className="bg-accent text-accent-foreground rounded px-1 text-[9px] font-semibold">
                  {rule.label}
                </span>
              )}
              <span className="font-mono">{entry.keyword}</span>
              <span className="text-muted-foreground tabular-nums">{entry.matchCount}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
