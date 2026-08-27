import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Button } from './Button';

/**
 * A side panel rather than a centred modal, and deliberately so: the rule form
 * has to stay open while the user watches the live preview update behind it
 * (plan §8.3). A modal with a dimming overlay would hide the very thing the form
 * is meant to demonstrate, so the scrim here is near-transparent.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          )}
        />
        <Dialog.Content
          className={cn(
            'bg-card fixed inset-y-0 left-0 z-50 flex w-full max-w-100 flex-col border-r shadow-xl',
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-left',
            'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left',
            'duration-(--duration-base)',
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div>
              <Dialog.Title className="text-sm font-semibold">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="text-muted-foreground mt-0.5 text-xs">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close">
                <X />
              </Button>
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {footer && <footer className="flex gap-2 border-t px-5 py-3.5">{footer}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
