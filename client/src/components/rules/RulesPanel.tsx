import { AnimatePresence, Reorder } from 'motion/react';
import { Plus, Sparkles, Wand2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { Rule, RuleMatchSummary } from '@/types';
import { RuleCard } from './RuleCard';

/** First-run state. One click to a working demo beats an explanation (plan §8.9). */
function EmptyState({ onLoadExamples, onCreate }: { onLoadExamples: () => void; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="bg-primary/10 text-primary mb-4 grid size-11 place-items-center rounded-xl">
        <Wand2 className="size-5" />
      </div>
      <h3 className="text-sm font-semibold">No rules yet</h3>
      <p className="text-muted-foreground mt-1.5 max-w-64 text-xs leading-relaxed">
        A rule finds a keyword in your text and marks it — highlighted in a colour, or tagged with a
        label.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <Button variant="primary" size="sm" onClick={onLoadExamples}>
          <Sparkles />
          Load example rules
        </Button>
        <Button variant="ghost" size="sm" onClick={onCreate}>
          Create one from scratch
        </Button>
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2 p-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-muted/60 h-24 animate-pulse rounded-lg" />
      ))}
    </div>
  );
}

export function RulesPanel({
  rules,
  summary,
  isLoading,
  loadError,
  onCreate,
  onEdit,
  onDelete,
  onToggle,
  onReorder,
  onLoadExamples,
  onRetry,
}: {
  rules: Rule[];
  summary: RuleMatchSummary[];
  isLoading: boolean;
  loadError: string | null;
  onCreate: () => void;
  onEdit: (rule: Rule) => void;
  onDelete: (rule: Rule) => void;
  onToggle: (rule: Rule, enabled: boolean) => void;
  onReorder: (rules: Rule[]) => void;
  onLoadExamples: () => void;
  onRetry: () => void;
}) {
  const countFor = (id: number) => summary.find((entry) => entry.ruleId === id)?.matchCount;
  const enabledCount = rules.filter((rule) => rule.isEnabled).length;

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Rules">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold">Rules</h2>
          {rules.length > 0 && (
            <span className="text-muted-foreground text-xs">
              {enabledCount} of {rules.length} active
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onCreate}>
          <Plus />
          New rule
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loadError ? (
          <div className="m-3 rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm font-medium">{loadError}</p>
            <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
              Try again
            </Button>
          </div>
        ) : isLoading ? (
          <SkeletonList />
        ) : rules.length === 0 ? (
          <EmptyState onLoadExamples={onLoadExamples} onCreate={onCreate} />
        ) : (
          <Reorder.Group
            axis="y"
            values={rules}
            onReorder={onReorder}
            className={cn('space-y-2 p-3')}
          >
            <AnimatePresence initial={false}>
              {rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  matchCount={countFor(rule.id)}
                  onEdit={() => onEdit(rule)}
                  onDelete={() => onDelete(rule)}
                  onToggle={(enabled) => onToggle(rule, enabled)}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </div>

      {rules.length > 0 && (
        <footer className="text-muted-foreground text-2xs shrink-0 border-t px-4 py-2">
          Drag to reorder — higher rules win when highlights overlap.
        </footer>
      )}
    </section>
  );
}
