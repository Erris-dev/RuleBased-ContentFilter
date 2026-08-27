# Rule-Based Content Filter — Implementation Plan

Plan of record for the AnchorzUp internship assignment. Source of truth for requirements is
`Internship Assignment.pdf`; this document translates it into a concrete build.

---

## 1. Goal

A small web application where a user defines **rules**, submits a **block of text**, and gets
back that text with matches **highlighted** and/or **tagged with tooltips**.

Example from the brief:

> Input: `The meeting with the finance team is tomorrow. The deadline is urgent.`

| Rule | Action |
| --- | --- |
| text contains `urgent` | highlight red |
| text contains `meeting` | highlight blue |
| text contains `deadline` | tooltip `IMPORTANT` |

Expected: `meeting` blue, `urgent` red, `deadline` carries an `IMPORTANT` tag. Rules persist and
are reused across submissions.

---

## 2. Requirements traceability

Every line below maps to a requirement in the PDF, so nothing gets dropped.

### Required (must ship)

| # | Requirement | Where it lands |
| --- | --- | --- |
| R1 | Create rules | `POST /api/rules` + Rule form |
| R2 | View existing rules | `GET /api/rules` + rule list |
| R3 | Match types: `contains`, `startsWith`, `exact` | matcher engine |
| R4 | Action type: highlight with a selected color | `actionType=highlight` + `color` |
| R5 | Action type: tooltip / label | `actionType=tooltip` + `label` |
| R6 | User can enter a block of text | textarea in Text Processing view |
| R7 | Text submitted to backend for processing | `POST /api/process` |
| R8 | All rules evaluated against input | matcher engine iterates enabled rules |
| R9 | Multiple rules may apply to the same text | overlap resolution (§6.3) |
| R10 | Processed output rendered with highlights, tags, visual indicators | `ProcessedText` renderer |
| R11 | Backend API stores rules and processes text | Express API |
| R12 | SQL database, minimum table `Rules(Id, Keyword, MatchType, ActionType, …)` | SQLite schema (§5) |
| R13 | README with setup + run instructions | §9 |
| R14 | Source code in a GitHub repository | already initialised |

### Chosen optional extras (scope: core + high-value extras)

| # | Extra | Why it earns its place |
| --- | --- | --- |
| O1 | Edit and delete rules | A create-only CRUD looks unfinished |
| O2 | Enable / disable rules | Lets the user demo rule effects without deleting data |
| O3 | Rule priority | Needed anyway to resolve conflicting highlights deterministically |
| O4 | Match count summary per rule | Cheap "visual indicator for matched rules" (R10) |
| O5 | Case-sensitivity toggle per rule | One column, removes an obvious reviewer question |
| O6 | Live preview while writing a rule | Closes the write-rule → see-effect loop; the highest-value UX feature in the brief's optional list |
| O7 | Bidirectional rule ↔ match hover linking | Makes "which rule did this?" answerable at a glance |
| O8 | Dark mode | Expected of a modern UI; also forces a disciplined colour-token system |
| O9 | Undo on delete | Destructive action without a safety net is a UX smell |
| O10 | Keyboard shortcuts | Cheap, and reviewers who try them notice |

### Explicitly out of scope

Rule grouping, auth, multi-user accounts. Noted in the README as deliberate cuts, not oversights.
A *separate* rule-testing interface is unnecessary once O6 exists — the live preview is the test
interface.

---

## 3. Stack

Versions below are what phase 1 actually installed, not aspirations.

| Layer | Choice | Rationale |
| --- | --- | --- |
| Frontend | React 19 + Vite 8 + TypeScript 5.7 | Fast dev server, no build config to explain |
| Backend | Node.js + Express 5 + TypeScript | Same language both sides, minimal ceremony |
| Database | SQLite via `better-sqlite3` 13 | Real SQL (R12), file-based, zero install for the reviewer |
| UI kit | shadcn/ui on Radix primitives | Components are copied into the repo, not imported — full control, no fighting a theme |
| Styling | Tailwind CSS 4 | Token-driven, keeps light/dark honest, no CSS file sprawl |
| Motion | Motion (`framer-motion`) | Layout animations for list add/remove/reorder; springs, not linear easing |
| Icons | `lucide-react` | Ships with shadcn, consistent stroke weight |
| Forms | `react-hook-form` + `zod` resolver | Same schema validates client and server |
| Validation | `zod` on the API boundary | Rejects bad rules with clear 400s |
| Tests | `vitest` on the matcher engine | The matcher is the only part with logic worth testing |

**Why Radix underneath matters here specifically:** tooltips are a *requirement* of this
assignment (R5), not chrome. Radix Tooltip gives portal rendering (chips near the container edge
never clip), keyboard and screen-reader access, and delay grouping so sweeping across several
chips doesn't re-trigger the open delay each time. Hand-rolled tooltips fail all three.

If a batteries-included kit is preferred over assembling shadcn, **Mantine** is the drop-in
alternative — its `ColorInput`, `Tooltip`, and `Switch` cover most of §8 out of the box, at the
cost of a more generic look.

SQLite satisfies "use a SQL database" while keeping `git clone && npm install && npm run dev` as
the entire setup. Schema is written in portable SQL so a swap to Postgres is a connection-string
change plus a driver.

---

## 4. Project structure

```
RuleBased-ContentFilter/
├── plan.md
├── README.md
├── package.json                 # npm workspaces: run both sides with one command
├── server/
│   ├── scripts/copy-schema.mjs      # copies schema.sql into dist/
│   ├── tests/                       # matcher suite (phase 4)
│   └── src/
│       ├── index.ts                    # entrypoint: listen + graceful shutdown
│       ├── app.ts                      # composition root + middleware order
│       ├── config.ts                   # env-derived settings
│       │
│       ├── routes/                     # path -> controller wiring only
│       │   ├── rules.routes.ts             — phase 3
│       │   ├── process.routes.ts           — phase 5
│       │   └── index.ts                    # mounts everything under /api
│       │
│       ├── controllers/                # request/response, status codes
│       │   ├── rules.controller.ts         — phase 3
│       │   └── process.controller.ts       — phase 5
│       │
│       ├── services/                   # domain rules, orchestration
│       │   ├── rules.service.ts            — phase 3
│       │   └── process.service.ts          — phase 5
│       │
│       ├── models/                     # the data layer
│       │   ├── rule.model.ts           # entity: types, enums, row mapping
│       │   ├── rule.repository.ts      # all SQL for the rules table
│       │   ├── rule.examples.ts        # the brief's rules (feeds §8.9)
│       │   └── index.ts
│       │
│       ├── validations/                # Zod contracts, shared with the client
│       │   ├── rule.validation.ts          — phase 3
│       │   └── process.validation.ts       — phase 5
│       │
│       ├── matcher/                    # pure functions: no Express, no SQL
│       │   ├── findMatches.ts          # per-rule match location    — phase 4
│       │   ├── resolveSegments.ts      # overlap -> flat segments   — phase 4
│       │   ├── processText.ts          # orchestration              — phase 4
│       │   └── index.ts
│       │
│       ├── database/                   # persistence infrastructure
│       │   ├── connection.ts           # factory, pragmas, schema bootstrap
│       │   ├── schema.sql              # CREATE TABLE / INDEX / TRIGGER
│       │   └── index.ts
│       │
│       ├── middleware/
│       │   ├── errorHandler.ts         # Zod + ApiError + 500 fallback
│       │   ├── notFoundHandler.ts
│       │   └── index.ts
│       │
│       └── errors/
│           ├── ApiError.ts             # typed errors + the one error body shape
│           └── index.ts
└── client/
    ├── vite.config.ts            # react + tailwind plugins, /api proxy
    └── src/
        ├── index.css             # design tokens, @theme (§8.1)
        ├── App.tsx               # split-pane shell, theme provider, toaster
        ├── api.ts                # typed fetch wrappers
        ├── hooks/
        │   ├── useRules.ts        # CRUD + optimistic updates
        │   ├── useProcessedText.ts# debounced auto-process
        │   └── useHoveredRule.ts  # shared rule <-> match hover state (O7)
        ├── components/
        │   ├── ui/                # shadcn primitives (button, dialog, select,
        │   │                      #   tooltip, switch, popover, sonner…)
        │   ├── rules/
        │   │   ├── RuleList.tsx
        │   │   ├── RuleCard.tsx
        │   │   ├── RuleForm.tsx
        │   │   ├── ColorSwatchPicker.tsx
        │   │   └── RuleEmptyState.tsx
        │   ├── text/
        │   │   ├── TextInput.tsx
        │   │   ├── ProcessedText.tsx
        │   │   ├── Segment.tsx     # one rendered span + its tooltip
        │   │   └── MatchSummary.tsx
        │   └── ThemeToggle.tsx
        ├── lib/
        │   ├── colors.ts          # palette, contrast + luminance helpers
        │   └── cn.ts              # class merge
        └── types.ts
```

### 4.1 Server architecture

A conventional **MVC layout, organised by layer**: `routes/`, `controllers/`, `services/`,
`models/`. Dependencies run one direction only — **route → controller → service → repository** —
and nothing calls back up.

| Layer | Owns | Must not |
| --- | --- | --- |
| `routes/` | Path-to-handler wiring, router construction | Contain logic |
| `controllers/` | Reading the request, choosing the status code | Contain domain rules or SQL |
| `services/` | Domain rules, orchestration, throwing `ApiError` | Touch `req`/`res`, write SQL |
| `models/` | The entity, its row mapping, and its SQL | Know about HTTP |
| `validations/` | Zod contracts, shared with the client | — |
| `matcher/` | The matching algorithm, as pure functions | Import Express or better-sqlite3 |

There is no `views/`: the view layer is the React client, and the API returns JSON only. So this is
MVC with the V living in `client/`.

**Two deliberate departures from textbook MVC**, both for the same reason:

1. **The model is split into entity and repository.** `rule.model.ts` holds the shape and row
   mapping; `rule.repository.ts` holds every SQL statement. An ActiveRecord-style model that knew
   how to save itself would drag better-sqlite3 into every file importing a `Rule` — including the
   matcher.
2. **A service layer sits between controller and model.** Without it the domain rules end up in the
   controllers, which is the fat-controller problem MVC is usually blamed for. It is also where the
   genuinely interesting logic lives: resolving a rule's `color`/`label` from its action type, and
   turning a missing id into a 404 rather than an empty result.

What this buys, concretely:

- **The matcher stays pure.** `matcher/` imports neither Express nor better-sqlite3, so the §6.6
  suite calls plain functions with plain arguments — no HTTP harness, no fixture database. That is
  the part of this codebase most worth testing, and this is what keeps testing it cheap.
- **Storage shape stops at the repository.** `snake_case` columns and SQLite's 0/1 booleans convert
  in exactly one place (`rowToRule`); no other layer sees them.
- **Swapping SQLite for Postgres touches `database/` and the repositories, nothing else.**

`app.ts` is the composition root: it builds each router's dependencies and mounts it. That is what
lets a test call `createApp()` against an in-memory database instead of booting a server.

**On proportionality:** four layers for six endpoints is more structure than the feature strictly
needs. It earns its place because the brief explicitly assesses backend design, and because the
layer names are the ones a reviewer will already be scanning for.

---

## 5. Database design

```sql
CREATE TABLE IF NOT EXISTS rules (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword        TEXT    NOT NULL,
  match_type     TEXT    NOT NULL CHECK (match_type IN ('contains','startsWith','exact')),
  action_type    TEXT    NOT NULL CHECK (action_type IN ('highlight','tooltip')),
  color          TEXT,                                 -- required when action_type='highlight'
  label          TEXT,                                 -- required when action_type='tooltip'
  priority       INTEGER NOT NULL DEFAULT 0,           -- higher wins on conflict
  is_enabled     INTEGER NOT NULL DEFAULT 1,           -- 0/1, SQLite has no BOOLEAN
  case_sensitive INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now')),

  CHECK (
    (action_type = 'highlight' AND color IS NOT NULL) OR
    (action_type = 'tooltip'   AND label IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_rules_enabled_priority
  ON rules (is_enabled, priority DESC, id ASC);
```

`server/src/schema.sql` is authoritative; the above is the shape, minus the boolean and non-empty
`CHECK`s and the `updated_at` trigger.

The four mandated fields (`Id`, `Keyword`, `MatchType`, `ActionType`) are present under snake_case
names; the rest are the "you may add additional fields if needed" allowance.

The `color`/`label` conditional requirement is enforced in `zod` as well as the DB, so the API
returns a readable message rather than a raw constraint violation.

Migrations: `schema.sql` is executed on boot, every statement `IF NOT EXISTS` so it is safe to
re-run. No migration framework — the schema is one table, and adding one would be ceremony.

Two things the schema enforces beyond the minimum:

- **A `CHECK` binding `action_type` to its payload** — a `highlight` row must have a `color`, a
  `tooltip` row must have a `label`. Zod enforces the same rule at the API edge so the user gets a
  readable message, but the constraint means the data cannot go bad even if something writes to the
  file directly.
- **An `AFTER UPDATE` trigger maintaining `updated_at`**, so no caller has to remember it.

There is no seed script. The example rules live in `examples.ts` and reach the database through the
"Load example rules" button (§8.9) instead — one path in, rather than a CLI script and a UI button
that can disagree.

---

## 6. The matcher engine (the core of the assignment)

This is where the marks are. Three sub-problems: locate matches, resolve overlaps, emit a
render-safe structure.

### 6.1 Match semantics

The brief says *"words matching rules should be highlighted"*, so matching is **word-oriented**,
not raw-substring. Scan the text and evaluate candidate spans at word boundaries:

| Match type | Rule | `keyword = "dead"` vs text |
| --- | --- | --- |
| `exact` | word equals keyword | matches `dead`, not `deadline` |
| `startsWith` | word begins with keyword | matches `dead`, `deadline` |
| `contains` | word contains keyword | matches `dead`, `deadline`, `undead` |

**Assumption to document in the README:** `startsWith` is interpreted as *a word starts with the
keyword*, not *the whole text block starts with the keyword*. The latter reading makes the match
type nearly useless next to `exact` and contradicts the word-level examples in the brief.
Supporting multi-word keywords (`"finance team"`) means the scan runs over the raw string with
boundary checks at both ends rather than a pure token loop.

Comparison is case-insensitive by default (O5 makes it configurable) — the brief's `urgent` should
match `Urgent` at the start of a sentence.

Output of this stage: `Match { ruleId, start, end }` character offsets, all rules pooled together.

### 6.2 Why offsets, not HTML

The backend returns **structured segments**, never an HTML string. Building HTML server-side from
user text invites XSS through both the input text and the rule `label`. React renders the segments
as elements, so escaping is automatic.

### 6.3 Overlap resolution

R9 requires multiple rules on the same text. Matches from different rules can partially overlap
(`deadline` tooltip vs `dead` highlight). Strategy — a **sweep line over match boundaries**:

1. Collect every `start` and `end` offset from all matches into a sorted set of cut points.
2. Walk consecutive cut points; each interval is a candidate segment.
3. For each segment, collect the rules whose match covers it.
4. Emit the segment with its rule set. Unmatched gaps become plain segments.

This produces a flat, non-overlapping, gap-free sequence that renders in one pass — no nested-span
gymnastics.

Per segment, the rule set reduces to visual output:

- **Highlight** — only one background colour can show, so the winner is the highlight rule with the
  highest `priority`, tie-broken by lowest `id` (deterministic, insertion order).
- **Tooltip** — labels *stack*. A segment can legitimately carry `[IMPORTANT] [PII]`; all labels
  are returned, ordered by priority.
- Every contributing `ruleId` is returned regardless of who "won", so the UI can show the full
  match list on hover and the summary can count accurately.

### 6.4 Response shape

```jsonc
{
  "segments": [
    { "text": "The ", "rules": [] },
    { "text": "meeting", "rules": [1], "highlight": "#3b82f6", "labels": [] },
    { "text": " with the finance team is tomorrow. The ", "rules": [] },
    { "text": "deadline", "rules": [3], "highlight": null, "labels": ["IMPORTANT"] },
    { "text": " is ", "rules": [] },
    { "text": "urgent", "rules": [2], "highlight": "#ef4444", "labels": [] },
    { "text": ".", "rules": [] }
  ],
  "summary": [
    { "ruleId": 1, "keyword": "meeting",  "matchCount": 1 },
    { "ruleId": 2, "keyword": "urgent",   "matchCount": 1 },
    { "ruleId": 3, "keyword": "deadline", "matchCount": 1 }
  ]
}
```

`summary` covers R10's "visual indicators for matched rules" and O4.

### 6.5 Complexity

The naive approach is `O(rules × text)`. At the expected input sizes (tens of rules, a paragraph)
that is fine and stays readable. The README notes that an Aho-Corasick automaton is the scaling
answer if rule count grows — stated as a known trade-off rather than pre-optimised.

### 6.6 Test cases (`vitest`)

The matcher is pure functions, so it is directly testable:

- each match type against `dead` / `deadline` / `undead`
- case-insensitive match, and a case-sensitive rule correctly not matching
- two highlight rules on the same span → higher priority wins
- highlight + tooltip on the same span → both applied
- partial overlap (`dead` vs `deadline`) → correct segment split
- disabled rule contributes nothing
- empty text, empty rule set, keyword not present
- multi-word keyword (`finance team`)
- segments concatenate back to exactly the input text (round-trip invariant)

That last one is the strongest guarantee: no matter how the overlaps resolve, no character is
dropped or duplicated.

---

## 7. API contract

The API listens on `http://localhost:3001/api`. The client calls it as a **relative `/api`**, with
Vite proxying to 3001 in development — so no API base URL has to be configured anywhere, and CORS
never enters the picture during normal use. CORS is still configured on the server, scoped to the
Vite origin, for anyone hitting the API directly.

Express 5 forwards rejected promises to the error middleware automatically, so route handlers can
be plain `async` functions with no `asyncHandler` wrapper.

JSON in, JSON out.

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| `GET` | `/rules` | — | `Rule[]`, ordered by priority desc, id asc |
| `POST` | `/rules` | `RuleInput` | `201` + created `Rule` |
| `PUT` | `/rules/:id` | `RuleInput` | `200` + updated `Rule` (O1) |
| `PATCH` | `/rules/:id` | `{ isEnabled }` | `200` + updated `Rule` (O2) |
| `DELETE` | `/rules/:id` | — | `204` (O1) |
| `POST` | `/process` | `{ text, draftRule? }` | `{ segments, summary }` |

**`draftRule` exists for the live preview (O6).** While the user is filling in the rule form, the
rule does not exist in the database yet — but the preview must show its effect. So `/process`
accepts an optional unsaved rule, validated with the same schema, which is merged into the rule set
for that one request only. Nothing is persisted. This keeps a single matching code path rather than
reimplementing the matcher client-side, which would inevitably drift from the server's behaviour.

`RuleInput`:

```ts
{
  keyword: string;          // 1..100 chars, non-blank
  matchType: 'contains' | 'startsWith' | 'exact';
  actionType: 'highlight' | 'tooltip';
  color?: string;           // required iff actionType === 'highlight'; #rrggbb
  label?: string;           // required iff actionType === 'tooltip'; 1..40 chars
  priority?: number;        // default 0
  isEnabled?: boolean;      // default true
  caseSensitive?: boolean;  // default false
}
```

Errors are uniform: `400` validation (with a field-level message), `404` unknown rule id, `500`
unexpected — caught by a single Express error middleware so no route hand-rolls its own shape.

`POST /process` reads rules from the DB itself rather than trusting a client-supplied rule list —
the brief specifies that the backend processes the text.

---

## 8. Frontend design

The guiding idea: **the app is one feedback loop — write a rule, see what it does to your text.**
Every UI decision below either tightens that loop or gets out of its way. A rule list and a
textarea sitting in separate tabs would satisfy the brief and feel dead; the goal is that changing
a rule visibly ripples into the output while you are still typing it.

### 8.1 Design language

Tokens defined once in `client/src/index.css`, consumed everywhere. No ad-hoc hex values in
components. (Tailwind v4 is CSS-first — tokens live in `@theme` blocks, not a `tailwind.config.ts`.)
Colours are authored in **oklch**, so a lightness step reads as the same visual step across every
hue — which matters when the highlight palette (§8.8) has to stay balanced across eight colours.

| Token group | Values |
| --- | --- |
| Type scale | 12 / 14 / 16 / 20 / 30 px; UI at 14, processed text at 16 for readability |
| Font | `Inter` (UI), `JetBrains Mono` (keyword fields — disambiguates `l`/`1`/`I` in match strings) |
| Spacing | 4 px base, 8-point rhythm; panel padding 24, control gap 12 |
| Radius | `sm` 6 / `md` 10 / `lg` 14; highlights get `sm` so they hug the text |
| Elevation | Two levels only — resting card, floating (popover/tooltip/dialog) |
| Surfaces | `bg` → `card` → `muted` three-step ladder, defined per theme |
| Motion | `fast` 120 ms, `base` 200 ms, `slow` 320 ms; spring for layout, ease-out for opacity |

Light and dark are both first-class, defined as CSS variables on `:root` and `.dark`. Every colour
in the app resolves through a token, so dark mode is one class toggle rather than a second
stylesheet.

### 8.2 Shell and layout

A resizable split pane: **rules on the left, text on the right**, both on screen at once so the
cause-and-effect is visible without navigation.

- Header: app name, rule-count badge, theme toggle, "Load example" button.
- Left pane 40%, right 60%, drag handle between them, width persisted to `localStorage`.
- Right pane splits vertically: input on top, processed output below, so you can see both the
  source and the result.
- The whole shell is one scroll-free viewport at desktop sizes; only the two panes scroll
  internally. Nothing important is ever below the fold.

### 8.3 Rule management panel (R1, R2, O1–O3)

Rules render as **cards, not table rows** — each rule carries heterogeneous data (a colour *or* a
label, a toggle, a priority) that a table crams awkwardly.

Each `RuleCard` shows:

- the keyword in mono type, with its match type as a subtle prefix badge (`contains` / `starts` /
  `exact`)
- the action rendered *as itself*: a highlight rule shows its keyword actually highlighted in its
  colour; a tooltip rule shows the real label chip. The card previews the effect rather than
  describing it.
- a live match count for the current text ("3 matches") — or a muted "no matches" state
- an enable switch, and edit / delete on hover (always visible on touch)
- disabled rules drop to 50% opacity and desaturate, staying legible but clearly inert

Cards are ordered by priority. Reordering by drag adjusts priority directly, so the conflict-
resolution rule from §6.3 becomes something you can *see* — drag a rule above another and watch the
overlapping highlight change colour.

`RuleForm` opens in a sheet (side panel) rather than a modal, so the text stays visible behind it
and the live preview keeps working while you type. Action type is a segmented control that swaps
the following field between `ColorSwatchPicker` and a label input — an invalid combination is
unreachable rather than merely rejected. Validation is inline on blur, never a wall of errors on
submit.

### 8.4 Text processing panel (R6, R7, R10)

- **TextInput** — auto-growing textarea, monospace-adjacent line height, character count, and a
  subtle "processing…" pulse on the border while a request is in flight. `Process` button present
  for discoverability even though processing is automatic (§8.5).
- **ProcessedText** — renders `segments` from §6.4:
  - plain → text node
  - `highlight` → `<mark>` with the rule's colour, foreground computed for contrast (§8.8)
  - `labels` → text followed by chips; the chip is the tooltip trigger
  - both → one `<mark>` carrying its chips
  - `white-space: pre-wrap` so the user's line breaks survive
- Hovering any matched span opens a Radix tooltip listing **every** rule that matched it — not just
  the one that won the highlight. This is what makes overlapping rules (§6.3) comprehensible
  instead of mysterious.
- **MatchSummary** — a row of rule chips with counts, each hover-linked to its matches (§8.6). Its
  header reads "3 of 5 rules matched · 7 total matches", with the numbers animating on change.

### 8.5 The live preview loop (O6)

The single most valuable UX decision in this build.

- Typing in the textarea re-processes after a **250 ms debounce**. No button press needed.
- Typing in the *rule form* also re-processes, sending the in-progress rule as `draftRule` (§7), so
  the output updates as you type the keyword — before the rule is ever saved.
- The draft rule's matches render with a **dashed outline** instead of a solid highlight, so
  "previewing" is visually distinct from "saved". Saving swaps dashed to solid — an animation that
  makes the commit feel real.
- Requests are cancelled via `AbortController` on supersede, so a fast typist never sees an older
  response overwrite a newer one.
- The previous output stays on screen while the next is in flight. Never blank the result — a
  flashing empty panel between keystrokes is the fastest way to make a fast app feel broken.

### 8.6 Rule ↔ match linking (O7)

Shared hover state connects the two panels in both directions:

- Hover a **rule card** → its matches in the output lift with a ring and a slight scale (1.0 →
  1.03); all other matches fade to 40%.
- Hover a **match** in the output → its rule card(s) ring and, if scrolled out of view, scroll into
  it smoothly.
- Same for summary chips.

This answers "which rule caused this?" instantly, and makes priority conflicts self-evident: hover
the losing rule and its span still lifts even though another rule owns the colour.

### 8.7 Motion

Motion is used to explain change, never to decorate.

| Event | Treatment |
| --- | --- |
| Rule created | Card springs in from the form's edge, list reflows via layout animation |
| Rule deleted | Card collapses height and fades; neighbours close the gap |
| Rule reordered | `layoutId` handles the shuffle — no manual position maths |
| Segment changes | New highlights fade their background in over 200 ms rather than snapping |
| Counts change | Digits roll rather than swap |
| Tooltip | 200 ms delay to open, grouped so adjacent chips open instantly |
| Preview → saved | Dashed outline morphs to solid fill |

All of it is wrapped in `prefers-reduced-motion` — that query collapses durations to near-zero
rather than disabling the feature, so nothing becomes unusable.

### 8.8 Colour and accessibility

The assignment is fundamentally about colour-coding text, which creates two obligations most
implementations miss:

1. **Colour cannot be the only signal.** Users with colour blindness can't distinguish a red
   highlight from a green one. So every highlight also carries a 2 px bottom border in a darker
   shade of its own hue, and the tooltip names the rule. The summary chips give a text legend.
2. **Contrast must hold on arbitrary backgrounds.** The user picks the colour, so the foreground is
   *computed*: relative luminance of the background decides near-black or near-white text, targeting
   WCAG AA (4.5:1). `lib/colors.ts` owns this.

`ColorSwatchPicker` offers **eight curated highlight colours** pre-tested for legibility in both
themes, plus a custom picker for anyone who wants it. Curated defaults mean the app looks
deliberate on first run instead of depending on the user's taste.

Also: full keyboard operability (Radix gives this), visible focus rings on every interactive
element, `aria-live="polite"` on the summary so screen readers hear the result change, and semantic
`<mark>` so the highlight is meaningful without CSS.

### 8.9 Empty, loading, and error states

The first thirty seconds decide the reviewer's impression, and that is entirely empty states.

- **No rules** — an illustrated card explaining what a rule does, with a primary **"Load example
  rules"** button that seeds the exact three rules from the PDF. One click to a working demo.
- **No text** — the textarea placeholder is the PDF's example sentence, with a "use this" affordance.
- **Text but no matches** — "No rules matched this text", plus a hint to check for disabled rules if
  any are off. A generic empty box here reads as a bug.
- **First load** — skeleton cards, not a spinner.
- **API unreachable** — an inline banner with a retry, not a toast that vanishes.
- **Mutations** — optimistic, so the UI never waits on the network. On failure the change rolls back
  and a toast explains why.
- **Delete** — optimistic with a toast carrying **Undo** for 5 s (O9); the request only fires when
  the toast expires.

### 8.10 Keyboard (O10)

| Key | Action |
| --- | --- |
| `Ctrl/⌘ + Enter` | Process now (bypass debounce) |
| `Ctrl/⌘ + K` | New rule |
| `/` | Focus the text area |
| `Esc` | Close sheet / cancel edit |
| `?` | Shortcut overlay |

### 8.11 Responsive

Below 900 px the split pane stacks into two tabs, **Rules** and **Text**, with the match count shown
on the Rules tab so the linkage survives the split. Touch targets go to 44 px, hover-only affordances
become always-visible, and tooltips trigger on tap.

---

## 9. README (deliverable R13)

Written last, but planned now — it is half the submission:

1. What the project does, plus screenshots of the processed example in light and dark, and a short
   GIF of the live preview loop — the feature that doesn't survive a static screenshot
2. Stack and why
3. Prerequisites (Node 18+)
4. Setup: `npm install`, `npm run dev` → both servers, ports listed
5. `npm test`
6. API reference table
7. **Design decisions and assumptions** — word-level `startsWith`, overlap resolution by priority,
   stacking tooltips, structured segments over HTML, SQLite choice
8. What is deliberately out of scope, and what would come next

---

## 10. Build order

Sequenced so there is a demoable slice early and the risky part is not left until the end.

| Phase | Work | Done when |
| --- | --- | --- |
| 1 | Workspace scaffolding, both dev servers running, health endpoint | `npm run dev` serves client and API |
| 2 | DB schema, connection, repository | Rules insert and read back through the repository |
| 3 | Rules CRUD + validation | All rule endpoints verified with curl |
| 4 | **Matcher engine + tests** | The §6.6 test list is green |
| 5 | `POST /process` wired to matcher | PDF example returns the §6.4 payload |
| 6 | Design tokens, shadcn init, app shell, theme toggle | Split pane renders in both themes with no unstyled flash |
| 7 | Rule management UI | Create, edit, delete, toggle from the browser |
| 8 | Text processing UI + segment renderer | PDF example renders with correct colours and tags |
| 9 | Live preview + debounced processing (O6) | Typing a keyword updates the output with no save |
| 10 | Rule ↔ match linking, motion pass (O7) | Hover in either panel lights up the other |
| 11 | Empty states, skeletons, toasts, undo, keyboard | Cold clone → working demo, no console errors |
| 12 | Accessibility + responsive pass | Keyboard-only run-through works; 375 px layout holds |
| 13 | README, screenshots, final pass | Fresh clone verified against the README steps |

Phase 4 comes before any UI: the matcher is the one part that can surprise, and it is testable
without a frontend. Phases 9–12 are where the UI stops being adequate and starts being good — they
are listed separately precisely so they don't get compressed into "polish" and dropped when time
runs short.

### Actual order taken

Phases 6–12 were built ahead of 3–5, on request. To avoid blocking on endpoints that did not exist:

- The matcher (phase 4) was written **for real**, as pure functions in `client/src/lib/matcher.ts`.
  It imports nothing but types, so it moves to `server/src/matcher/` unchanged.
- Everything else the UI needed from the API is served by `client/src/lib/mockApi.ts`, which
  implements the §7 contract exactly and persists to `localStorage`.
- `client/src/api.ts` is the only file that knows which of the two is in use.

**Remaining work is therefore:** write phases 3 and 5 against the existing contract, move
`matcher.ts` to the server, add the phase-4 test suite against it, and repoint `api.ts` at `fetch`.
Nothing above `api.ts` should need to change — that is the property the seam exists to provide.

---

## 11. Risks

| Risk | Mitigation |
| --- | --- |
| `startsWith` interpreted differently than the reviewer expects | Documented assumption in README with the reasoning; the alternate reading is a one-line change |
| Overlapping matches producing corrupted output | Round-trip invariant test — segments must rejoin into the exact input |
| XSS through rule labels or input text | Never build HTML server-side; React escapes on render |
| Unreadable text on a dark highlight colour | Compute foreground from background luminance (§8.8) |
| Reviewer's environment differs | SQLite + Node only; no Docker, no external DB, no global installs |
| Highlight colour alone is meaningless to colour-blind users | Border weight + label chips + tooltip as redundant signals (§8.8) |
| Live preview firing a request per keystroke | 250 ms debounce + `AbortController` cancellation; matcher is cheap (§6.5) |
| Animation making the app feel slow rather than smooth | Durations capped at 320 ms; motion only on state change, never on load; `prefers-reduced-motion` honoured |
| UI library work crowding out correctness | Matcher and API ship complete at phase 5, before any component work starts |

---

## 12. Definition of done

- [ ] Every row in the §2 required table is implemented and manually verified
- [ ] The PDF's example scenario reproduces exactly, end to end
- [ ] Matcher tests pass, including the round-trip invariant
- [ ] A fresh `git clone` runs by following only the README
- [ ] Rules persist across a server restart
- [ ] No console errors or unhandled promise rejections in a normal session

UI/UX bar:

- [ ] Typing a rule keyword updates the preview without saving, and without flicker
- [ ] Hovering a rule highlights its matches, and vice versa
- [ ] Light and dark both look deliberate; no unstyled flash on load
- [ ] Every flow is completable with the keyboard alone, with visible focus throughout
- [ ] Highlights remain distinguishable in a greyscale screenshot
- [ ] Every state has a designed treatment — empty, loading, error, no-matches
- [ ] Layout holds at 375 px with no horizontal scroll
- [ ] `prefers-reduced-motion` disables animation without breaking any feature
