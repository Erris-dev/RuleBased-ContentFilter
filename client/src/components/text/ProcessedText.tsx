import { Fragment } from 'react';

import { Tooltip } from '@/components/ui/Tooltip';
import { useHoveredRule } from '@/hooks/useHoveredRule';
import { cn } from '@/lib/cn';
import { highlightBorder, readableForeground } from '@/lib/colors';
import { MATCH_TYPE_LABELS, type Rule, type Segment } from '@/types';

/** Names every rule covering a span — including ones that lost the highlight. */
function SegmentTooltip({ rules }: { rules: Rule[] }) {
  return (
    <div className="space-y-1.5">
      {rules.map((rule, index) => (
        <div key={rule.id} className="flex items-center gap-1.5">
          {rule.actionType === 'highlight' && rule.color ? (
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: rule.color }}
            />
          ) : (
            <span className="bg-accent text-accent-foreground shrink-0 rounded px-1 text-[9px] font-semibold">
              {rule.label}
            </span>
          )}
          <span className="font-mono">{rule.keyword}</span>
          <span className="text-muted-foreground">{MATCH_TYPE_LABELS[rule.matchType]}</span>
          {/* Only the first highlight rule paints the background. */}
          {index > 0 && rule.actionType === 'highlight' && (
            <span className="text-muted-foreground text-[10px]">(overridden)</span>
          )}
        </div>
      ))}
    </div>
  );
}

function RenderedSegment({ segment, rulesById }: { segment: Segment; rulesById: Map<number, Rule> }) {
  const { hoveredId, setHoveredId } = useHoveredRule();

  if (segment.rules.length === 0) return <>{segment.text}</>;

  const rules = segment.rules
    .map((id) => rulesById.get(id))
    .filter((rule): rule is Rule => rule !== undefined);

  const isLinked = hoveredId !== null && segment.rules.includes(hoveredId);
  const isDimmed = hoveredId !== null && !isLinked;
  const { highlight, labels, isDraft } = segment;

  return (
    <Tooltip content={<SegmentTooltip rules={rules} />} disabled={rules.length === 0}>
      <mark
        onMouseEnter={() => setHoveredId(segment.rules[0] ?? null)}
        onMouseLeave={() => setHoveredId(null)}
        tabIndex={0}
        className={cn(
          'relative rounded-sm px-0.5 transition-all duration-(--duration-base)',
          'cursor-default outline-none focus-visible:ring-2',
          !highlight && 'bg-transparent text-inherit',
          isLinked && 'z-10 scale-[1.03]',
          isDimmed && 'opacity-40',
          // A draft rule previews as a dashed outline; saving swaps it to solid.
          isDraft && 'outline-2 outline-offset-1 outline-dashed',
        )}
        style={{
          ...(highlight
            ? {
                backgroundColor: highlight,
                color: readableForeground(highlight),
                // The second, non-colour signal every highlight carries (plan §8.8).
                boxShadow: `inset 0 -2px 0 ${highlightBorder(highlight)}`,
              }
            : {}),
          ...(isDraft ? { outlineColor: highlight ?? 'var(--primary)' } : {}),
        }}
      >
        {segment.text}
        {labels.map((label) => (
          <span
            key={label}
            className={cn(
              'bg-accent text-accent-foreground ml-1 rounded px-1 py-0.5 align-middle',
              'text-[10px] font-semibold tracking-wide',
            )}
          >
            {label}
          </span>
        ))}
      </mark>
    </Tooltip>
  );
}

export function ProcessedText({
  segments,
  rulesById,
}: {
  segments: Segment[];
  rulesById: Map<number, Rule>;
}) {
  return (
    // pre-wrap keeps the user's own line breaks and spacing intact.
    <p className="text-base leading-[1.9] whitespace-pre-wrap">
      {segments.map((segment, index) => (
        <Fragment key={`${index}-${segment.text.slice(0, 8)}`}>
          <RenderedSegment segment={segment} rulesById={rulesById} />
        </Fragment>
      ))}
    </p>
  );
}
