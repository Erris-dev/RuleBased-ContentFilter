import * as RadixSwitch from '@radix-ui/react-switch';

import { cn } from '@/lib/cn';

export function Switch({
  checked,
  onCheckedChange,
  className,
  ...props
}: RadixSwitch.SwitchProps) {
  return (
    <RadixSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        'peer inline-flex h-[18px] w-8 shrink-0 cursor-pointer items-center rounded-full',
        'border-2 border-transparent transition-colors duration-(--duration-fast)',
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/35',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RadixSwitch.Thumb
        className={cn(
          'bg-card pointer-events-none block size-3.5 rounded-full shadow-sm ring-0',
          'transition-transform duration-(--duration-fast)',
          'data-[state=checked]:translate-x-[14px] data-[state=unchecked]:translate-x-0',
        )}
      />
    </RadixSwitch.Root>
  );
}
