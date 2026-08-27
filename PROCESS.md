# Work process

How this project was built: the order decisions were made in, why the build order changed partway
through, and how the work is verified. `plan.md` is the *plan of record* — what is being built and
why. This document is the *method* — how I went about building it.

---

## 1. Brief first, code last

The source of truth is `Internship Assignment.pdf`. Before writing anything I turned it into a
table of numbered requirements (`plan.md` §2), one row per line of the brief, each with a column
naming the file or endpoint that satisfies it.

Two reasons for the table rather than a checklist:

- **Nothing silently drops.** If a requirement has no destination, that is visible immediately
  rather than at submission time.
- **It fixes scope.** The same section records the optional extras I chose (`O1`–`O10`) and the
  ones I explicitly cut — rule grouping, auth, multi-user accounts. A cut that is written down is
  a decision; a cut that is not is an oversight, and reviewers can tell the difference.

Anything I could not settle from the brief became a documented assumption instead of a guess. The
main one is `startsWith`: I read it as *word*-initial, not *text*-initial, and both the README and
the plan say so along with the reasoning, because the other reading is defensible and it is a
one-line change if the reviewer disagrees.

## 2. Design the hard part on paper

The matcher is where the marks are, so it was specified before any code: match semantics, overlap
resolution, response shape, complexity (`plan.md` §6). Two decisions came out of that and shaped
everything after:

- **Offsets and segments, never HTML strings.** The backend returns structured segments with
  start/end offsets; the client renders them as React nodes. Building HTML server-side would make
  rule labels and user text an injection vector, and React escaping is free.
- **A round-trip invariant.** However overlaps resolve, the segments must rejoin into exactly the
  input text. That single property catches almost every class of bug the overlap logic can have,
  and it is the test I trust most.

The API contract (`plan.md` §7) was written at the same time, before either side existed. Fixing
the contract early is what made the next section possible.

## 3. Build order, and the deviation from it

The planned order (`plan.md` §10) puts a demoable slice early and the risky part — the matcher — at
phase 4, ahead of any UI. The order actually taken ran phases 6–12 (the whole frontend) before
phases 3–5 (rule CRUD and `/process`).

That reordering was only safe because of one file. `client/src/api.ts` is the sole seam between UI
and backend; everything above it works in terms of typed functions, not `fetch`. Behind the seam
sat `mockApi.ts`, which implemented the §7 contract exactly and persisted to `localStorage`, while
the matcher was written **for real** — pure functions importing nothing but types.

When the endpoints landed, the bet paid: the matcher moved to `server/src/matcher/` split into its
three stages but otherwise unchanged, the endpoints were written around it, and `api.ts` was
repointed at `fetch`. **Nothing above `api.ts` changed except two call sites that had nothing to do
with transport** — `DRAFT_RULE_ID` moved into `types.ts` when its module left the client, and
"Load example rules" now calls `POST /api/rules/examples` so the example definition lives on the
server only.

The cost of the reordering was carrying a mock for a while. The benefit was that the UI was
demoable — and its design problems findable — a long time before the backend existed.

## 4. Structure chosen for the reader, not the line count

Four layers — routes, controllers, services, models — for seven endpoints is more structure than
the feature strictly needs, and `plan.md` §4.1 says so out loud. It earns its place because the
brief assesses backend design and because those layer names are the ones a reviewer scans for. The
rule I held to is that dependencies run one direction only: route → controller → service →
repository, and nothing calls back up.

Two departures from textbook MVC, both to protect the matcher: the model is split into entity and
repository so no file importing a `Rule` drags SQLite in with it, and a service layer keeps domain
logic out of controllers. The concrete payoff is visible in the tests — `matcher.test.ts` needs no
HTTP harness and no fixture database, because `matcher/` imports neither Express nor
better-sqlite3.

## 5. Working rhythm

- **Foundations before features.** Error handling, config, and the design-token layer exist before
  the code that depends on them, so nothing has to be retrofitted.
- **Tokens over values.** No component carries a raw colour. Light/dark stays honest because there
  is one place to change.
- **One definition, one path in.** The example rules live on the server and reach the database
  through one endpoint, rather than a UI copy and a seed script that can disagree.
- **Comments explain decisions, not syntax.** Where a file has a header comment it says what the
  file is *for* and what must not leak into it.
- **History organised as a build.** Commits are grouped so the log reads bottom-up in dependency
  order — workspace, server foundations, data layer, client scaffolding, matcher, API seam, UI,
  then the endpoints and tests. Conventional-commit prefixes with the workspace as scope.

## 6. How it gets verified

| What | How | Result |
| --- | --- | --- |
| Matcher correctness | `npm test` — the §6.6 list, incl. the round-trip invariant | 39 passing |
| API behaviour | Same suite: real Express + real SQLite, in memory | Passing |
| Types | `npm run typecheck` across both workspaces | Clean |
| Production build | `npm run build` | Clean |
| The brief's example | `POST /api/process` against the seeded rules | Byte-for-byte the §6.4 payload |
| Persistence | Restart the server against the same file, re-read `/api/rules` | Rules survive |
| The real UI | Seed, create, preview, toggle and delete in the browser | Each hits the API; DB reflects it |
| Console | Browser console during a normal session | No errors |

`plan.md` §12 is the full definition of done; the table above is the part I re-run rather than
read.

## 7. What is not here

Screenshots for the README (`plan.md` §9) are the one outstanding item.

Out of scope by choice, not omission: rule grouping, authentication, multi-user accounts, and a
separate rule-testing screen — the live preview already is one.

---

*Last updated 2026-08-27.*
