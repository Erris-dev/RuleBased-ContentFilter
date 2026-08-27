import type { ComponentProps, ReactNode } from 'react';
import { useId } from 'react';

import { cn } from '@/lib/cn';

/**
 * Label + control + error message, wired together with a generated id so the
 * label actually points at its input and the error is announced.
 */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby': string }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const describedBy = `${id}-message`;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-xs font-medium">
        {label}
      </label>

      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}

      <p
        id={describedBy}
        className={cn('text-2xs leading-tight', error ? 'text-destructive' : 'text-muted-foreground')}
        // Only errors interrupt; hints are read on focus, not announced.
        role={error ? 'alert' : undefined}
      >
        {error ?? hint}
      </p>
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'border-input bg-card h-9 w-full rounded-md border px-3 text-sm',
        'placeholder:text-muted-foreground/70',
        'transition-[border-color,box-shadow] duration-(--duration-fast)',
        'focus-visible:border-ring focus-visible:ring-ring/25 focus-visible:ring-2 focus-visible:outline-none',
        'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20',
        'disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
