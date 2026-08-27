# Rule-Based Content Filter

Define rules that automatically detect and visually mark patterns in text. Create a rule such as
*"highlight `urgent` in red"* or *"tag `deadline` as IMPORTANT"*, paste in a block of text, and see
the matches highlighted and labelled.

Internship assignment for **AnchorzUp**.

> ### Status: complete
>
> Rules are created, edited, toggled and deleted through the API and stored in SQLite; text is
> processed on the server by [`server/src/matcher/`](server/src/matcher); the React client talks to
> the API over `fetch` and nothing else. `npm test` runs 39 tests across the matching engine and
> the HTTP layer.
>
> What is deliberately left out is listed under [Scope](#scope).

---

## What it does

**Rules**

- Create, edit, delete, and enable/disable rules
- Match types: `contains`, `startsWith`, `exact` — all word-oriented (see
  [Assumptions](#design-decisions-and-assumptions))
- Actions: **highlight** in a chosen colour, or attach a **tooltip label**
- Per-rule case sensitivity and priority
- Deleting is undoable for five seconds before it is sent

**Text processing**

- Paste or type any block of text and see it processed
- Every enabled rule is evaluated, and several rules may match the same span
- Overlapping matches resolve into flat segments — one highlight wins by priority, tooltip labels
  stack
- A summary lists each rule and how many times it matched

**Interface**

- Live preview: typing in the rule form updates the output before the rule is saved
- Hovering a rule lights up its matches, and hovering a match lights up its rule
- Light and dark themes, remembered across visits
- Keyboard: `Ctrl`/`Cmd`+`K` new rule, `Ctrl`/`Cmd`+`Enter` process now, `/` focus the text area
- Responsive down to 375 px; `prefers-reduced-motion` is honoured

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS 4 |
| Backend | Node.js, Express 5, TypeScript |
| Database | SQLite (`better-sqlite3`) |
| UI | Radix primitives, Motion, Lucide icons |
| Validation | Zod, shared between client and server |
| Tests | Vitest |

SQLite was chosen so the project runs with no database server to install or configure — `npm
install` and `npm run dev` is the entire setup. The schema is plain, portable SQL, so moving to
PostgreSQL is a driver and connection-string change.

---

## Requirements

- **Node.js 18 or newer** (developed on 24)
- npm 9+

Nothing else. No Docker, no database server, no global installs. `better-sqlite3` ships prebuilt
binaries, so no C++ toolchain is needed on a normal Windows, macOS, or Linux machine.

---

## Setup

```bash
git clone https://github.com/Erris-dev/RuleBased-ContentFilter.git
```

```bash
cd RuleBased-ContentFilter && npm install
```

This installs both workspaces (`server` and `client`) in one step.

## Running

```bash
npm run dev
```

Starts both servers together:

| | URL |
| --- | --- |
| Frontend | <http://localhost:5173> |
| API | <http://localhost:3001/api> |
| Health check | <http://localhost:3001/api/health> |

Open <http://localhost:5173>. The client calls the API through a Vite proxy on a relative `/api`
path, so there is no API URL to configure.

To run just one side:

```bash
npm run dev:server
```

```bash
npm run dev:client
```

## Trying it

With the app open, **Load example rules** seeds the three rules from the brief and its example
text:

| Rule | Match type | Action |
| --- | --- | --- |
| `urgent` | contains | highlight red |
| `meeting` | contains | highlight blue |
| `deadline` | contains | tooltip `IMPORTANT` |

> The meeting with the finance team is tomorrow. The deadline is urgent.

`meeting` renders blue, `urgent` red, and `deadline` carries an `IMPORTANT` label with a tooltip.
Editing a rule's keyword updates the output as you type, without saving.

## Other commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Both dev servers with hot reload |
| `npm run build` | Type-checks and builds both workspaces for production |
| `npm run typecheck` | Type-checks both workspaces without emitting |
| `npm test` | The test suite: matching engine + API, 39 tests |

---

## API reference

Base URL `http://localhost:3001/api`. JSON in, JSON out.

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| `GET` | `/health` | — | `{ status, uptime }` |
| `GET` | `/rules` | — | `Rule[]`, priority desc, id asc |
| `POST` | `/rules` | `RuleInput` | `201` + created `Rule` |
| `POST` | `/rules/examples` | — | `201` + the brief's three `Rule`s |
| `PUT` | `/rules/:id` | `RuleInput` | `200` + updated `Rule` |
| `PATCH` | `/rules/:id` | `{ isEnabled }` | `200` + updated `Rule` |
| `DELETE` | `/rules/:id` | — | `204` |
| `POST` | `/process` | `{ text, draftRule? }` | `{ segments, summary }` |

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

`POST /process` returns the text as flat, non-overlapping segments plus a per-rule summary:

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

Errors are uniform across every route: `400` validation with a field-level message, `404` unknown
rule id, `500` unexpected — produced by one Express error middleware, so no route hand-rolls its
own shape.

---

## Design decisions and assumptions

**Matching is word-oriented.** The brief says *"words matching rules should be highlighted"*, so
candidate spans are evaluated at word boundaries rather than as raw substrings. For
`keyword = "dead"`: `exact` matches `dead` only; `startsWith` matches `dead` and `deadline`;
`contains` also matches `undead`.

**`startsWith` means a _word_ starts with the keyword** — not that the whole text block does. This
is the one genuinely ambiguous line in the brief. The text-block reading makes the match type
nearly useless next to `exact` and contradicts the brief's word-level examples. If the other
reading is intended, it is a one-line change in the matcher.

**Comparison is case-insensitive by default,** so the brief's `urgent` matches `Urgent` at the
start of a sentence. A per-rule `caseSensitive` flag opts out.

**Overlaps resolve by sweep line, not nesting.** Every match boundary becomes a cut point; each
interval between consecutive cut points is emitted as one segment carrying every rule that covers
it. The result is flat, gap-free, and renders in a single pass. Per segment: only one background
colour can show, so the highest-priority highlight wins (ties broken by lowest id, i.e. insertion
order), while tooltip labels **stack** — a span can legitimately carry `[IMPORTANT] [PII]`. Every
contributing rule id is returned regardless of which one won, so hover linking and the match
summary stay accurate.

**The invariant that keeps this honest:** segments must concatenate back to exactly the input
text. No character dropped, none duplicated, whatever the overlaps do.

**Structured segments, never server-rendered HTML.** Building HTML from user text and rule labels
would invite XSS through both. React renders segments as elements, so escaping is automatic.

**Colour is never the only signal.** Highlights carry a border and a label chip as well as a
background, and the foreground colour is computed from the background's luminance — so the output
stays readable on any swatch and remains distinguishable in greyscale.

**`POST /process` accepts an optional unsaved `draftRule`** so the live preview can show a rule's
effect before it is saved, without reimplementing the matcher client-side where it would drift
from the server's behaviour.

**The database enforces what validation enforces.** A `highlight` row must have a `color` and a
`tooltip` row must have a `label` — a `CHECK` constraint in SQL as well as a Zod refinement at the
API edge, so the data cannot go bad even if something writes to the file directly.

---

## Project structure

```
├── plan.md              # full implementation plan
├── PROCESS.md           # how the project was built
├── server/              # Express API + SQLite + matching engine
│   ├── scripts/          # build helpers
│   ├── tests/            # matcher suite + API suite
│   └── src/
│       ├── index.ts      # entrypoint
│       ├── app.ts        # composition root + middleware order
│       ├── config.ts     # port, origins, database path
│       ├── routes/       # path -> controller wiring
│       ├── controllers/  # request/response, status codes
│       ├── services/     # domain rules, 404s
│       ├── models/       # entity, row mapping, SQL
│       ├── validations/  # Zod contracts
│       ├── matcher/      # the matching engine (pure functions)
│       ├── database/     # connection, pragmas, schema.sql
│       ├── middleware/   # error + 404 handlers
│       └── errors/       # ApiError, error body shape
└── client/              # React + Vite frontend
    └── src/
        ├── index.css     # design tokens (light + dark)
        ├── App.tsx       # split-pane shell, theme, shortcuts
        ├── api.ts        # the single seam between UI and backend
        ├── types.ts
        ├── hooks/        # rules, debounced processing, hover, theme
        ├── lib/          # validation, colours, sample text
        └── components/
            ├── ui/       # Button, Field, Switch, Tooltip, Sheet, SplitPane…
            ├── rules/    # rule panel, card, form, colour picker
            └── text/     # text panel, processed output, match summary
```

The server follows a conventional **MVC layout organised by layer**, with dependencies running one
direction only: **route → controller → service → model**. There is no `views/` — the view layer is
the React client, and the API returns JSON only.

Two deliberate departures from textbook MVC: the model is split into an entity (`rule.model.ts`)
and a repository (`rule.repository.ts`) so that persistence never leaks into anything importing a
`Rule`; and a service layer sits between controller and model so domain rules don't accumulate in
the controllers. Both exist to keep the matching engine a set of pure functions with no Express or
SQL imports, so it can be tested directly.

See [plan.md §4.1](plan.md) for the full rationale.

---

## Configuration

All optional — the defaults work out of the box.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | API port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Comma-separated CORS allowlist |
| `DATABASE_FILE` | `data/rules.db` | SQLite file location |

---

## Tests

```bash
npm test
```

Two suites, both in `server/tests/`:

- **`matcher.test.ts`** — the engine as plain function calls: each match type against
  `dead`/`deadline`/`undead`, case sensitivity, priority conflicts, stacked tooltips, partial
  overlaps, disabled rules, draft previews, empty input, the brief's example, and the **round-trip
  invariant** — segments must rejoin into exactly the input, whatever the overlaps do.
- **`rules.api.test.ts`** — the real Express app over a real SQLite database, in memory: CRUD,
  ordering, validation messages, 404s, and `/process` reading rules from the database rather than
  from the request.

The engine imports neither Express nor better-sqlite3, which is what keeps its suite free of an
HTTP harness and fixture files.

---

## Scope

**Deliberately out of scope:** rule grouping, authentication, and multi-user accounts. These are
cuts, not oversights — the brief does not ask for them, and each would pull in a data model far
larger than the feature it serves. A separate rule-testing screen is also omitted: the live
preview already is one.

**What would come next,** given more time: regex as a fourth match type, import/export of a rule
set as JSON, and pagination once a rule list outgrows one screen. None of these change the shape
of what is here.

---

## Documentation

- [plan.md](plan.md) — requirements traceability, matcher design, API contract, build order
- [PROCESS.md](PROCESS.md) — how the project was built and how it is verified

---

## License

Written as an internship assignment submission.
