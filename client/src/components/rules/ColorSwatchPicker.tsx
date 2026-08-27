import { Check } from 'lucide-react';

import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';
import { HIGHLIGHT_COLORS, readableForeground } from '@/lib/colors';

/**
 * Curated swatches first, custom picker as an escape hatch (plan §8.8). Offering
 * a raw colour input alone would let the user pick something illegible and make
 * the app look like their worst choice.
 */
export function ColorSwatchPicker({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (color: string) => void;
  id?: string;
}) {
  const isCustom = !HIGHLIGHT_COLORS.some((c) => c.value.toLowerCase() === value.toLowerCase());

  return (
    <div id={id} className="flex flex-wrap items-center gap-1.5">
      {HIGHLIGHT_COLORS.map((color) => {
        const selected = color.value.toLowerCase() === value.toLowerCase();
        return (
          <Tooltip key={color.value} content={color.name}>
            <button
              type="button"
              onClick={() => onChange(color.value)}
              aria-label={color.name}
              aria-pressed={selected}
              className={cn(
                'grid size-7 place-items-center rounded-md',
                'transition-transform duration-(--duration-fast) hover:scale-110',
                selected && 'ring-ring ring-2 ring-offset-2 ring-offset-(--card)',
              )}
              style={{ backgroundColor: color.value }}
            >
              {selected && (
                <Check className="size-3.5" style={{ color: readableForeground(color.value) }} />
              )}
            </button>
          </Tooltip>
        );
      })}

      <Tooltip content="Custom colour">
        <label
          className={cn(
            'relative grid size-7 cursor-pointer place-items-center rounded-md',
            'border-border border border-dashed',
            'transition-transform duration-(--duration-fast) hover:scale-110',
            isCustom && 'ring-ring border-solid ring-2 ring-offset-2 ring-offset-(--card)',
          )}
          style={isCustom ? { backgroundColor: value } : undefined}
        >
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Custom colour"
          />
          {isCustom ? (
            <Check className="size-3.5" style={{ color: readableForeground(value) }} />
          ) : (
            <span
              aria-hidden
              className="size-3 rounded-full"
              style={{
                background:
                  'conic-gradient(#ef4444,#f59e0b,#22c55e,#3b82f6,#8b5cf6,#ec4899,#ef4444)',
              }}
            />
          )}
        </label>
      </Tooltip>
    </div>
  );
}
