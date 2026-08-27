import { Keyboard, Moon, Sun } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toaster } from 'sonner';

import { EXAMPLE_TEXT } from '@/api';
import { RuleForm, draftToInput, type RuleDraft } from '@/components/rules/RuleForm';
import { RulesPanel } from '@/components/rules/RulesPanel';
import { TextPanel } from '@/components/text/TextPanel';
import { Button } from '@/components/ui/Button';
import { SplitPane } from '@/components/ui/SplitPane';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';
import { HoveredRuleProvider, useHoveredRuleState } from '@/hooks/useHoveredRule';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useProcessedText } from '@/hooks/useProcessedText';
import { useRules } from '@/hooks/useRules';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/cn';
import { DRAFT_RULE_ID } from '@/lib/matcher';
import { ruleInputSchema } from '@/lib/validation';
import type { Rule, RuleInput } from '@/types';

const SHORTCUTS = [
  { keys: '⌘/Ctrl + K', action: 'New rule' },
  { keys: '⌘/Ctrl + ↵', action: 'Process now' },
  { keys: '/', action: 'Focus the text' },
  { keys: 'Esc', action: 'Close the form' },
];

export default function App() {
  const hovered = useHoveredRuleState();

  return (
    <TooltipProvider>
      <HoveredRuleProvider value={hovered}>
        <Workspace />
        <Toaster position="bottom-right" toastOptions={{ className: 'text-sm' }} />
      </HoveredRuleProvider>
    </TooltipProvider>
  );
}

function Workspace() {
  const { theme, toggleTheme } = useTheme();
  const isDesktop = useMediaQuery('(min-width: 900px)');

  const {
    rules,
    isLoading,
    loadError,
    reload,
    createRule,
    updateRule,
    setEnabled,
    deleteRule,
    loadExamples,
    reorder,
  } = useRules();

  const [text, setText] = useState(EXAMPLE_TEXT);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [draft, setDraft] = useState<RuleDraft | null>(null);
  const [tab, setTab] = useState<'rules' | 'text'>('text');

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  /**
   * The in-progress rule, shaped as a real Rule so the matcher can run it.
   * Only a *valid* draft previews — a half-typed keyword should not blank the
   * output. Editing reuses the rule's own id so the preview replaces it rather
   * than matching alongside it.
   */
  const draftRule = useMemo<Rule | null>(() => {
    if (!formOpen || !draft?.keyword.trim()) return null;

    const input = draftToInput(draft);
    if (!ruleInputSchema.safeParse(input).success) return null;

    return {
      id: editing?.id ?? DRAFT_RULE_ID,
      keyword: input.keyword,
      matchType: input.matchType,
      actionType: input.actionType,
      color: input.color ?? null,
      label: input.label ?? null,
      // Ranked above saved rules so the rule being authored is always visible.
      priority: editing?.priority ?? 9999,
      isEnabled: true,
      caseSensitive: input.caseSensitive ?? false,
      createdAt: '',
      updatedAt: '',
    };
  }, [formOpen, draft, editing]);

  const result = useProcessedText(text, rules, draftRule);

  /** Includes the draft so the output panel can describe a rule that isn't saved. */
  const rulesById = useMemo(() => {
    const map = new Map(rules.map((rule) => [rule.id, rule]));
    if (draftRule) map.set(draftRule.id, draftRule);
    return map;
  }, [rules, draftRule]);

  /**
   * Opening the form switches the stacked layout to the text tab. The form's
   * whole point is the live preview beside it, and on a narrow screen the sheet
   * covers only part of the width — leaving the rules list behind it would hide
   * the very thing the user is editing against.
   */
  const revealPreview = useCallback(() => {
    if (!isDesktop) setTab('text');
  }, [isDesktop]);

  const openCreate = useCallback(() => {
    setEditing(null);
    revealPreview();
    setFormOpen(true);
  }, [revealPreview]);

  const openEdit = useCallback(
    (rule: Rule) => {
      setEditing(rule);
      revealPreview();
      setFormOpen(true);
    },
    [revealPreview],
  );

  const handleSubmit = useCallback(
    async (input: RuleInput) => {
      if (editing) await updateRule(editing.id, input);
      else await createRule(input);
    },
    [editing, createRule, updateRule],
  );

  // Keyboard shortcuts (plan §8.10).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openCreate();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        result.processNow();
        return;
      }

      // Bare keys must not hijack typing.
      if (event.key === '/' && !typing) {
        event.preventDefault();
        if (!isDesktop) setTab('text');
        textareaRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openCreate, result, isDesktop]);

  const rulesPanel = (
    <RulesPanel
      rules={rules}
      summary={result.summary}
      isLoading={isLoading}
      loadError={loadError}
      onCreate={openCreate}
      onEdit={openEdit}
      onDelete={deleteRule}
      onToggle={(rule, enabled) => void setEnabled(rule.id, enabled)}
      onReorder={(next) => void reorder(next.map((rule) => rule.id))}
      onLoadExamples={() => void loadExamples()}
      onRetry={() => void reload()}
    />
  );

  const textPanel = (
    <TextPanel
      text={text}
      onTextChange={setText}
      result={result}
      isProcessing={result.isProcessing}
      rulesById={rulesById}
      hasRules={rules.length > 0}
      textareaRef={textareaRef}
    />
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="bg-primary/12 text-primary grid size-7 shrink-0 place-items-center rounded-md font-mono text-sm font-semibold">
            R
          </span>
          <h1 className="truncate text-sm font-semibold tracking-tight">
            Rule-Based Content Filter
          </h1>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip
            content={
              <dl className="space-y-1">
                {SHORTCUTS.map((shortcut) => (
                  <div key={shortcut.keys} className="flex justify-between gap-4">
                    <dt>{shortcut.action}</dt>
                    <dd className="text-muted-foreground font-mono">{shortcut.keys}</dd>
                  </div>
                ))}
              </dl>
            }
          >
            <Button variant="ghost" size="icon" aria-label="Keyboard shortcuts">
              <Keyboard />
            </Button>
          </Tooltip>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </Button>
        </div>
      </header>

      {isDesktop ? (
        <SplitPane left={rulesPanel} right={textPanel} />
      ) : (
        <>
          {/* Below 900px the panels stack into tabs (plan §8.11). */}
          <div role="tablist" className="flex shrink-0 border-b">
            {(['text', 'rules'] as const).map((value) => (
              <button
                key={value}
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={cn(
                  'relative flex-1 py-2.5 text-xs font-medium capitalize',
                  'transition-colors duration-(--duration-fast)',
                  tab === value ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {value}
                {value === 'rules' && rules.length > 0 && (
                  <span className="text-muted-foreground ml-1.5">{rules.length}</span>
                )}
                {tab === value && <span className="bg-primary absolute inset-x-0 bottom-0 h-0.5" />}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1">{tab === 'rules' ? rulesPanel : textPanel}</div>
        </>
      )}

      <RuleForm
        open={formOpen}
        editing={editing}
        onOpenChange={setFormOpen}
        onDraftChange={setDraft}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
