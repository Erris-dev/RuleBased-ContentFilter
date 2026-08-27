import { describe, expect, it } from 'vitest';

import { findMatches, processText } from '../src/matcher/index.js';
import type { Rule, RuleInput } from '../src/models/rule.model.js';

/**
 * The matcher suite from plan §6.6.
 *
 * These are plain function calls: no HTTP, no database, no fixtures to tear
 * down. That is the whole reason `matcher/` imports neither Express nor
 * better-sqlite3.
 */

let nextId = 1;

/** A saved rule, with the defaults filled in so tests state only what matters. */
const rule = (input: RuleInput & { id?: number }): Rule => ({
  id: input.id ?? nextId++,
  keyword: input.keyword,
  matchType: input.matchType,
  actionType: input.actionType,
  color: input.color ?? null,
  label: input.label ?? null,
  priority: input.priority ?? 0,
  isEnabled: input.isEnabled ?? true,
  caseSensitive: input.caseSensitive ?? false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const highlight = (keyword: string, extra: Partial<RuleInput> = {}) =>
  rule({ keyword, matchType: 'contains', actionType: 'highlight', color: '#ef4444', ...extra });

const tooltip = (keyword: string, label: string, extra: Partial<RuleInput> = {}) =>
  rule({ keyword, matchType: 'contains', actionType: 'tooltip', label, ...extra });

/** The text each matched span covers, in order. */
const matchedText = (text: string, r: Rule): string[] =>
  findMatches(text, r).map((m) => text.slice(m.start, m.end));

const BRIEF_TEXT = 'The meeting with the finance team is tomorrow. The deadline is urgent.';

describe('match types', () => {
  const text = 'dead deadline undead';

  it('exact matches the whole word only', () => {
    expect(matchedText(text, highlight('dead', { matchType: 'exact' }))).toEqual(['dead']);
  });

  it('startsWith matches words beginning with the keyword', () => {
    expect(matchedText(text, highlight('dead', { matchType: 'startsWith' }))).toEqual([
      'dead',
      'deadline',
    ]);
  });

  it('contains matches the keyword anywhere in a word', () => {
    expect(matchedText(text, highlight('dead', { matchType: 'contains' }))).toEqual([
      'dead',
      'deadline',
      'undead',
    ]);
  });

  it('marks the whole word, not just the keyword inside it', () => {
    // "words matching rules should be highlighted" — so a hit on "dead" inside
    // "deadline" highlights all eight characters.
    const [match] = findMatches('deadline', highlight('dead'));
    expect(match).toEqual({ ruleId: expect.any(Number), start: 0, end: 8 });
  });

  it('matches a multi-word keyword across the space', () => {
    expect(matchedText(BRIEF_TEXT, highlight('finance team'))).toEqual(['finance team']);
  });
});

describe('case sensitivity', () => {
  it('ignores case by default', () => {
    expect(matchedText('Urgent business', highlight('urgent'))).toEqual(['Urgent']);
  });

  it('respects case when the rule asks for it', () => {
    expect(matchedText('Urgent business', highlight('urgent', { caseSensitive: true }))).toEqual([]);
  });
});

describe('overlap resolution', () => {
  it('gives the span to the highest-priority highlight', () => {
    const loser = highlight('deadline', { color: '#3b82f6', priority: 1 });
    const winner = highlight('deadline', { color: '#ef4444', priority: 9 });

    const { segments } = processText('the deadline', [loser, winner]);
    const marked = segments.find((s) => s.text === 'deadline');

    expect(marked?.highlight).toBe('#ef4444');
    // The rule that lost is still reported, so the UI can name every match.
    expect(marked?.rules).toEqual([winner.id, loser.id]);
  });

  it('applies a highlight and a tooltip to the same span', () => {
    const colour = highlight('deadline', { color: '#ef4444' });
    const label = tooltip('deadline', 'IMPORTANT');

    const { segments } = processText('the deadline', [colour, label]);
    const marked = segments.find((s) => s.text === 'deadline');

    expect(marked?.highlight).toBe('#ef4444');
    expect(marked?.labels).toEqual(['IMPORTANT']);
  });

  it('stacks every tooltip label covering a span, highest priority first', () => {
    const first = tooltip('deadline', 'IMPORTANT', { priority: 5 });
    const second = tooltip('deadline', 'PII', { priority: 1 });

    const { segments } = processText('the deadline', [first, second]);

    expect(segments.find((s) => s.text === 'deadline')?.labels).toEqual(['IMPORTANT', 'PII']);
  });

  it('splits a partial overlap at the boundary', () => {
    // "finance team" covers two words; "team" covers the second. The shared part
    // must become its own segment carrying both rules.
    const phrase = highlight('finance team', { color: '#3b82f6' });
    const word = tooltip('team', 'TEAM');

    const { segments } = processText('the finance team meets', [phrase, word]);

    expect(segments.map((s) => s.text)).toEqual(['the ', 'finance ', 'team', ' meets']);
    expect(segments[1]?.rules).toEqual([phrase.id]);
    expect(segments[2]?.rules).toEqual([phrase.id, word.id]);
    expect(segments[2]?.labels).toEqual(['TEAM']);
  });
});

describe('which rules participate', () => {
  it('ignores disabled rules entirely', () => {
    const disabled = highlight('urgent', { isEnabled: false });

    const { segments, summary } = processText('this is urgent', [disabled]);

    expect(segments).toEqual([{ text: 'this is urgent', rules: [], highlight: null, labels: [] }]);
    expect(summary).toEqual([]);
  });

  it('lets a draft rule preview without being saved', () => {
    const draft = rule({
      id: -1,
      keyword: 'urgent',
      matchType: 'contains',
      actionType: 'highlight',
      color: '#ef4444',
    });

    const { segments } = processText('this is urgent', [], draft);

    expect(segments.find((s) => s.text === 'urgent')?.isDraft).toBe(true);
  });

  it('lets a draft replace the saved rule it is editing', () => {
    const saved = highlight('meeting', { id: 7, color: '#3b82f6' });
    const edited = { ...saved, keyword: 'deadline' };

    const { summary } = processText('the meeting and the deadline', [saved], edited);

    // One entry, not two: the draft stands in for the rule rather than joining it.
    expect(summary).toEqual([{ ruleId: 7, keyword: 'deadline', matchCount: 1 }]);
  });
});

describe('empty and no-match cases', () => {
  it('returns no segments for empty text', () => {
    expect(processText('', [highlight('urgent')])).toEqual({
      segments: [],
      summary: [{ ruleId: expect.any(Number), keyword: 'urgent', matchCount: 0 }],
    });
  });

  it('returns the text as one plain segment when there are no rules', () => {
    expect(processText(BRIEF_TEXT, [])).toEqual({
      segments: [{ text: BRIEF_TEXT, rules: [], highlight: null, labels: [] }],
      summary: [],
    });
  });

  it('reports a rule that matched nothing', () => {
    const { segments, summary } = processText(BRIEF_TEXT, [highlight('invoice')]);

    expect(segments).toHaveLength(1);
    expect(summary).toEqual([{ ruleId: expect.any(Number), keyword: 'invoice', matchCount: 0 }]);
  });
});

describe("the brief's example", () => {
  it('reproduces the expected output', () => {
    const meeting = highlight('meeting', { color: '#3b82f6', priority: 10 });
    const urgent = highlight('urgent', { color: '#ef4444', priority: 20 });
    const deadline = tooltip('deadline', 'IMPORTANT');

    const { segments, summary } = processText(BRIEF_TEXT, [urgent, meeting, deadline]);

    expect(segments).toEqual([
      { text: 'The ', rules: [], highlight: null, labels: [] },
      { text: 'meeting', rules: [meeting.id], highlight: '#3b82f6', labels: [] },
      { text: ' with the finance team is tomorrow. The ', rules: [], highlight: null, labels: [] },
      { text: 'deadline', rules: [deadline.id], highlight: null, labels: ['IMPORTANT'] },
      { text: ' is ', rules: [], highlight: null, labels: [] },
      { text: 'urgent', rules: [urgent.id], highlight: '#ef4444', labels: [] },
      { text: '.', rules: [], highlight: null, labels: [] },
    ]);

    expect(summary).toEqual([
      { ruleId: urgent.id, keyword: 'urgent', matchCount: 1 },
      { ruleId: meeting.id, keyword: 'meeting', matchCount: 1 },
      { ruleId: deadline.id, keyword: 'deadline', matchCount: 1 },
    ]);
  });
});

describe('round-trip invariant', () => {
  /**
   * The strongest guarantee in the engine: however the overlaps resolve, the
   * segments must rejoin into exactly the input. No character dropped, none
   * duplicated (plan §6.6).
   */
  const cases: Array<[string, string, Rule[]]> = [
    ['no rules', BRIEF_TEXT, []],
    ['one match', BRIEF_TEXT, [highlight('urgent')]],
    [
      'stacked and overlapping rules',
      BRIEF_TEXT,
      [
        highlight('finance team', { color: '#3b82f6', priority: 5 }),
        tooltip('team', 'TEAM'),
        highlight('deadline', { color: '#ef4444', priority: 9 }),
        tooltip('deadline', 'IMPORTANT'),
        highlight('the', { matchType: 'exact', color: '#22c55e' }),
      ],
    ],
    ['adjacent words', 'dead deadline undead', [highlight('dead'), tooltip('dead', 'D')]],
    ['punctuation and newlines', 'Urgent: the deadline!\nMeeting tomorrow.', [
      highlight('urgent'),
      tooltip('deadline', 'IMPORTANT'),
      highlight('meeting', { color: '#3b82f6' }),
    ]],
    ['unicode and apostrophes', "don't miss the déjà-vu meeting", [highlight('meeting'), highlight('déjà')]],
  ];

  it.each(cases)('%s', (_name, text, rules) => {
    const { segments } = processText(text, rules);
    expect(segments.map((s) => s.text).join('')).toBe(text);
  });
});
