import { motion } from 'motion/react';
import { useId } from 'react';

import { cn } from '@/lib/cn';

interface SegmentedProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  'aria-label'?: string;
  id?: string;
}

/**
 * A radio group styled as a segmented control. Preferred over a <select> for the
 * match/action type because every option stays visible — the choice is part of
 * understanding the feature, not a detail to hide behind a dropdown.
 *
 * The sliding indicator is one shared `layoutId`, so Motion animates it between
 * positions instead of cross-fading two elements.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  id,
  ...props
}: SegmentedProps<T>) {
  const groupId = useId();

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={props['aria-label']}
      className="bg-muted inline-flex w-full gap-0.5 rounded-md p-0.5"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex-1 rounded-[5px] px-2 py-1.5 text-xs font-medium',
              'transition-colors duration-(--duration-fast)',
              selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {selected && (
              <motion.span
                layoutId={`segmented-${groupId}`}
                className="bg-card absolute inset-0 rounded-[5px] shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
