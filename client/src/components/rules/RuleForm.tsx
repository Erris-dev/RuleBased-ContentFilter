import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';
import { ruleInputSchema, toFieldErrors } from '@/lib/validation';
import { DEFAULT_HIGHLIGHT } from '@/lib/colors';
import {
  MATCH_TYPE_HINTS,
  MATCH_TYPE_LABELS,
  MATCH_TYPES,
  type Rule,
  type RuleInput,
} from '@/types';
import { ColorSwatchPicker } from './ColorSwatchPicker';

export interface RuleDraft {
  keyword: string;
  matchType: RuleInput['matchType'];
  actionType: RuleInput['actionType'];
  color: string;
  label: string;
  caseSensitive: boolean;
}

export const emptyDraft = (): RuleDraft => ({
  keyword: '',
  matchType: 'contains',
  actionType: 'highlight',
  color: DEFAULT_HIGHLIGHT,
  label: '',
  caseSensitive: false,
});

const draftFromRule = (rule: Rule): RuleDraft => ({
  keyword: rule.keyword,
  matchType: rule.matchType,
  actionType: rule.actionType,
  color: rule.color ?? DEFAULT_HIGHLIGHT,
  label: rule.label ?? '',
  caseSensitive: rule.caseSensitive,
});

export const draftToInput = (draft: RuleDraft, priority?: number): RuleInput => ({
  keyword: draft.keyword,
  matchType: draft.matchType,
  actionType: draft.actionType,
  color: draft.actionType === 'highlight' ? draft.color : null,
  label: draft.actionType === 'tooltip' ? draft.label : null,
  caseSensitive: draft.caseSensitive,
  ...(priority === undefined ? {} : { priority }),
});

/**
 * Create/edit form in a side sheet.
 *
 * `onDraftChange` streams every keystroke up so the output panel can preview the
 * unsaved rule (plan §8.5) — the form is not just collecting values, it is
 * driving a live preview while it is open.
 */
export function RuleForm({
  open,
  editing,
  onOpenChange,
  onDraftChange,
  onSubmit,
}: {
  open: boolean;
  editing: Rule | null;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: RuleDraft | null) => void;
  onSubmit: (input: RuleInput) => Promise<void>;
}) {
  const [draft, setDraft] = useState<RuleDraft>(emptyDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Reset whenever the sheet opens, so a cancelled edit never bleeds into the next.
  useEffect(() => {
    if (!open) return;
    setDraft(editing ? draftFromRule(editing) : emptyDraft());
    setErrors({});
  }, [open, editing]);

  // Publish the draft upward while open; clear it on close so the preview stops.
  useEffect(() => {
    onDraftChange(open ? draft : null);
  }, [open, draft, onDraftChange]);

  const patch = (changes: Partial<RuleDraft>) => setDraft((current) => ({ ...current, ...changes }));

  /** Validates one field on blur — errors appear as you leave a field, not as a wall on submit. */
  const validateField = (field: keyof RuleDraft) => {
    const result = ruleInputSchema.safeParse(draftToInput(draft));
    const all = result.success ? {} : toFieldErrors(result.error);
    setErrors((current) => {
      const next = { ...current };
      if (all[field]) next[field] = all[field];
      else delete next[field];
      return next;
    });
  };

  const handleSubmit = async () => {
    const input = draftToInput(draft);
    const result = ruleInputSchema.safeParse(input);
    if (!result.success) {
      setErrors(toFieldErrors(result.error));
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit(input);
      onOpenChange(false);
    } catch (error) {
      const details = (error as { details?: Record<string, string> }).details;
      setErrors(details ?? { _: 'Could not save the rule' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Edit rule' : 'New rule'}
      description="Changes preview live in the text on the right."
      footer={
        <>
          <Button variant="primary" onClick={handleSubmit} disabled={isSaving} className="flex-1">
            {isSaving ? 'Saving…' : editing ? 'Save changes' : 'Create rule'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <Field label="Keyword" error={errors.keyword} hint="The text to look for.">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={draft.keyword}
              onChange={(event) => patch({ keyword: event.target.value })}
              onBlur={() => validateField('keyword')}
              placeholder="e.g. urgent"
              className="font-mono"
              autoFocus
            />
          )}
        </Field>

        <Field label="Match type" hint={MATCH_TYPE_HINTS[draft.matchType]}>
          {({ id }) => (
            <Segmented
              id={id}
              aria-label="Match type"
              value={draft.matchType}
              onChange={(matchType) => patch({ matchType })}
              options={MATCH_TYPES.map((type) => ({ value: type, label: MATCH_TYPE_LABELS[type] }))}
            />
          )}
        </Field>

        <Field label="Action">
          {({ id }) => (
            <Segmented
              id={id}
              aria-label="Action type"
              value={draft.actionType}
              onChange={(actionType) => patch({ actionType })}
              options={[
                { value: 'highlight', label: 'Highlight' },
                { value: 'tooltip', label: 'Tooltip' },
              ]}
            />
          )}
        </Field>

        {/* The action choice swaps this field, so an invalid combination is unreachable. */}
        {draft.actionType === 'highlight' ? (
          <Field label="Colour" error={errors.color} hint="Text colour adjusts automatically.">
            {({ id }) => (
              <ColorSwatchPicker
                id={id}
                value={draft.color}
                onChange={(color) => patch({ color })}
              />
            )}
          </Field>
        ) : (
          <Field label="Label" error={errors.label} hint="Shown as a tag beside the match.">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                value={draft.label}
                onChange={(event) => patch({ label: event.target.value })}
                onBlur={() => validateField('label')}
                placeholder="e.g. IMPORTANT"
              />
            )}
          </Field>
        )}

        <div className="flex items-center justify-between gap-4 border-t pt-4">
          <div>
            <p className="text-xs font-medium">Case sensitive</p>
            <p className="text-muted-foreground text-2xs mt-0.5">
              Off means “Urgent” and “urgent” both match.
            </p>
          </div>
          <Switch
            checked={draft.caseSensitive}
            onCheckedChange={(caseSensitive) => patch({ caseSensitive })}
            aria-label="Case sensitive"
          />
        </div>

        {errors._ && <p className="text-destructive text-xs">{errors._}</p>}

        {/* Enables Enter-to-submit without a visible duplicate button. */}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Sheet>
  );
}
