import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Wraps the whole app. `delayDuration` sets the open delay; `skipDelayDuration`
 * is the grouping window — once one tooltip has opened, moving to a neighbour
 * opens instantly rather than waiting again. Sweeping across a row of chips then
 * feels continuous instead of stuttering (plan §8.7).
 */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={200} skipDelayDuration={400}>
      {children}
    </RadixTooltip.Provider>
  );
}

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Rendered as a plain wrapper when there is nothing to say. */
  disabled?: boolean;
}

export function Tooltip({ content, children, side = 'top', disabled }: TooltipProps) {
  if (disabled) return <>{children}</>;

  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            'bg-popover text-popover-foreground z-50 max-w-72 rounded-md border px-2.5 py-1.5',
            'text-xs shadow-md',
            'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out',
            'data-[state=delayed-open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=delayed-open]:zoom-in-95 data-[side=top]:slide-in-from-bottom-1',
            'data-[side=bottom]:slide-in-from-top-1',
          )}
        >
          {content}
          <RadixTooltip.Arrow className="fill-popover" width={10} height={5} />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
