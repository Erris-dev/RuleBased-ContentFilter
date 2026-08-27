import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/cn';

const STORAGE_KEY = 'split';
const MIN_PERCENT = 26;
const MAX_PERCENT = 62;

const clamp = (value: number) => Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, value));

/**
 * Two panes with a draggable divider. The width persists, so the layout someone
 * arranges is the one they get back.
 *
 * The handle is a focusable separator with arrow-key support — a drag-only
 * divider is unreachable by keyboard.
 */
export function SplitPane({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [percent, setPercent] = useState<number>(() => {
    const stored = Number.parseFloat(localStorage.getItem(STORAGE_KEY) ?? '');
    return Number.isFinite(stored) ? clamp(stored) : 38;
  });
  const [isDragging, setIsDragging] = useState(false);

  const persist = useCallback((value: number) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      /* private mode — the width just resets next visit */
    }
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (event: PointerEvent) => {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      setPercent(clamp(((event.clientX - bounds.left) / bounds.width) * 100));
    };

    const onUp = () => {
      setIsDragging(false);
      setPercent((current) => {
        persist(current);
        return current;
      });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    // Stops text selection mid-drag from fighting the pointer.
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, persist]);

  const nudge = (delta: number) => {
    setPercent((current) => {
      const next = clamp(current + delta);
      persist(next);
      return next;
    });
  };

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1">
      <div className="min-w-0" style={{ width: `${percent}%` }}>
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panels"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={MIN_PERCENT}
        aria-valuemax={MAX_PERCENT}
        tabIndex={0}
        onPointerDown={() => setIsDragging(true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') nudge(-3);
          if (event.key === 'ArrowRight') nudge(3);
        }}
        className={cn(
          'group relative w-px shrink-0 cursor-col-resize',
          'bg-border transition-colors duration-(--duration-fast)',
          isDragging && 'bg-ring',
        )}
      >
        {/* Hit area wider than the visible line, so it is grabbable. */}
        <span className="absolute inset-y-0 -left-1.5 w-3.5" />
        <span
          className={cn(
            'bg-ring absolute inset-y-0 -left-px w-[3px] opacity-0 transition-opacity',
            'group-hover:opacity-100 group-focus-visible:opacity-100',
            isDragging && 'opacity-100',
          )}
        />
      </div>

      <div className="min-w-0 flex-1">{right}</div>
    </div>
  );
}
