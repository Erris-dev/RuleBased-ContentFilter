import { Reorder, useDragControls } from 'motion/react';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Tooltip } from '@/components/ui/Tooltip';
import { useHoveredRule } from '@/hooks/useHoveredRule';
import { cn } from '@/lib/cn';
import { highlightBorder, readableForeground, tint } from '@/lib/colors';
import { MATCH_TYPE_LABELS, type Rule } from '@/types';

/**
 * Shows the rule's effect rather than describing it: a highlight rule renders its
 * own keyword highlighted in its colour, a tooltip rule renders its real label
 * chip. The card is a live sample of what the rule does (plan §8.3).
 */
function ActionPreview({ rule }: { rule: Rule }) {
  if (rule.actionType === 'highlight' && rule.color) {
    return (
      <span
        className="rounded-sm px-1.5 py-0.5 font-mono text-xs"
        style={{
          backgroundColor: rule.color,
          color: readableForeground(rule.color),
          boxShadow: `inset 0 -2px 0 ${highlightBorder(rule.color)}`,
        }}
      >
        {rule.keyword}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="decoration-muted-foreground/60 font-mono text-xs underline decoration-dotted underline-offset-4">
        {rule.keyword}
      </span>
      <span className="bg-accent text-accent-foreground rounded px-1 py-0.5 text-[10px] font-semibold tracking-wide">
        {rule.label}
      </span>
    </span>
  );
}

export function RuleCard({
  rule,
  matchCount,
  onEdit,
  onDelete,
  onToggle,
}: {
  rule: Rule;
  matchCount: number | undefined;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const { hoveredId, setHoveredId } = useHoveredRule();
  const dragControls = useDragControls();
  const isHovered = hoveredId === rule.id;
  const accent = rule.color ?? undefined;

  return (
    <Reorder.Item
      value={rule}
      dragListener={false}
      dragControls={dragControls}
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      onHoverStart={() => setHoveredId(rule.id)}
      onHoverEnd={() => setHoveredId(null)}
      onFocus={() => setHoveredId(rule.id)}
      onBlur={() => setHoveredId(null)}
      className={cn(
        'group bg-card relative rounded-lg border p-3',
        'transition-[border-color,box-shadow,opacity] duration-(--duration-fast)',
        isHovered && 'border-ring/50 shadow-sm',
        // Disabled rules stay legible but read as clearly inert.
        !rule.isEnabled && 'opacity-55 saturate-50',
      )}
      style={
        isHovered && accent ? { boxShadow: `0 0 0 1px ${tint(accent, 0.5)}` } : undefined
      }
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label={`Reorder ${rule.keyword}`}
          onPointerDown={(event) => dragControls.start(event)}
          className={cn(
            'text-muted-foreground/40 hover:text-muted-foreground -ml-1 cursor-grab touch-none',
            'rounded p-0.5 transition-colors active:cursor-grabbing',
          )}
        >
          <GripVertical className="size-4" />
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              {MATCH_TYPE_LABELS[rule.matchType]}
            </span>
            {rule.caseSensitive && (
              <Tooltip content="Case sensitive">
                <span className="text-muted-foreground border-border rounded border px-1 font-mono text-[10px]">
                  Aa
                </span>
              </Tooltip>
            )}
          </div>

          <ActionPreview rule={rule} />

          <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
            {matchCount === undefined ? null : matchCount > 0 ? (
              <span className="text-foreground font-medium">
                {matchCount} {matchCount === 1 ? 'match' : 'matches'}
              </span>
            ) : (
              <span>No matches</span>
            )}
            <span aria-hidden>·</span>
            <span>priority {rule.priority}</span>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          {/*
            Hidden until hover on wide layouts; always visible below 900px, which
            is the same breakpoint the panels stack at — hover is unreliable on
            touch, and the two thresholds must agree or a gap appears between them.
          */}
          <div className="flex opacity-0 transition-opacity duration-(--duration-fast) group-focus-within:opacity-100 group-hover:opacity-100 max-[899px]:opacity-100">
            <Tooltip content="Edit">
              <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit ${rule.keyword}`}>
                <Pencil />
              </Button>
            </Tooltip>
            <Tooltip content="Delete">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onDelete}
                aria-label={`Delete ${rule.keyword}`}
                className="hover:text-destructive"
              >
                <Trash2 />
              </Button>
            </Tooltip>
          </div>

          <Tooltip content={rule.isEnabled ? 'Disable rule' : 'Enable rule'}>
            <span className="ml-1 flex">
              <Switch
                checked={rule.isEnabled}
                onCheckedChange={onToggle}
                aria-label={`${rule.isEnabled ? 'Disable' : 'Enable'} ${rule.keyword}`}
              />
            </span>
          </Tooltip>
        </div>
      </div>
    </Reorder.Item>
  );
}
