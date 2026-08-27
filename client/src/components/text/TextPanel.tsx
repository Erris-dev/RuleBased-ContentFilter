import { Eraser, FileText, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { EXAMPLE_TEXT } from '@/api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { ProcessResult, Rule } from '@/types';
import { MatchSummary } from './MatchSummary';
import { ProcessedText } from './ProcessedText';

export function TextPanel({
  text,
  onTextChange,
  result,
  isProcessing,
  rulesById,
  hasRules,
  textareaRef,
}: {
  text: string;
  onTextChange: (text: string) => void;
  result: ProcessResult;
  isProcessing: boolean;
  rulesById: Map<number, Rule>;
  hasRules: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const growRef = useRef<HTMLTextAreaElement | null>(null);

  // Grow to fit the content instead of showing an inner scrollbar.
  useEffect(() => {
    const el = growRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
  }, [text]);

  const hasOutput = result.segments.length > 0;

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Text">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Text</h2>
          {isProcessing && (
            <Loader2 className="text-muted-foreground size-3.5 animate-spin" aria-label="Processing" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {!text && (
            <Button variant="ghost" size="sm" onClick={() => onTextChange(EXAMPLE_TEXT)}>
              <Sparkles />
              Use example
            </Button>
          )}
          {text && (
            <Button variant="ghost" size="sm" onClick={() => onTextChange('')}>
              <Eraser />
              Clear
            </Button>
          )}
        </div>
      </header>

      <div className="shrink-0 border-b p-4">
        <textarea
          ref={(node) => {
            growRef.current = node;
            textareaRef.current = node;
          }}
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder={EXAMPLE_TEXT}
          aria-label="Text to process"
          rows={3}
          className={cn(
            'bg-card w-full resize-none rounded-lg border p-3 text-sm leading-relaxed',
            'placeholder:text-muted-foreground/60',
            'transition-[border-color,box-shadow] duration-(--duration-fast)',
            'focus-visible:border-ring focus-visible:ring-ring/20 focus-visible:ring-2 focus-visible:outline-none',
          )}
        />
        <div className="text-muted-foreground mt-1.5 flex justify-between text-[11px]">
          <span>Processes as you type</span>
          <span className="tabular-nums">{text.length} characters</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!text.trim() ? (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-center">
            <FileText className="size-5 opacity-50" />
            <p className="text-xs">Enter some text above to see your rules applied.</p>
          </div>
        ) : hasOutput ? (
          <div className="space-y-5">
            <ProcessedText segments={result.segments} rulesById={rulesById} />
            <div className="border-t pt-4">
              {result.summary.some((entry) => entry.matchCount > 0) ? (
                <MatchSummary summary={result.summary} rulesById={rulesById} />
              ) : (
                <p className="text-muted-foreground text-xs">
                  {hasRules
                    ? 'No rules matched this text. Check that the rules you expect are enabled.'
                    : 'No rules yet — create one to start marking up this text.'}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
