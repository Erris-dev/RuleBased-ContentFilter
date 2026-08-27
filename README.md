# Rule-Based Content Filter

Define rules that automatically detect and visually mark patterns in text. Create a rule such as
*"highlight `urgent` in red"* or *"tag `deadline` as IMPORTANT"*, paste in a block of text, and see
the matches highlighted and labelled.

Internship assignment for **AnchorzUp**.

> **Status: in development.**
>
> The **frontend is complete and fully interactive** — rule CRUD, live preview, overlap handling,
> light/dark, keyboard shortcuts, responsive layout.
>
> The **server currently exposes only `/api/health`.** The rule and text-processing endpoints
> (phases 3–5) are not written yet, so the UI runs against an in-browser mock in
> `client/src/lib/mockApi.ts` that implements the exact same contract and persists to
> `localStorage`. Swapping to the real API is a change to `client/src/api.ts` alone.
>
> The matching engine in `client/src/lib/matcher.ts` is the real implementation and moves to
> `server/src/matcher/` unchanged when the endpoints land.
>
> See [plan.md](plan.md) for the full build plan and phase list.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS 4 |
| Backend | Node.js, Express 5, TypeScript |
| Database | SQLite (`better-sqlite3`) |
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
git clone https://github.com/<your-username>/RuleBased-ContentFilter.git
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

## Other commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Both dev servers with hot reload |
| `npm run build` | Type-checks and builds both workspaces for production |
| `npm run typecheck` | Type-checks both workspaces without emitting |
| `npm test` | Runs the matcher engine test suite |

---

## Project structure

```
├── plan.md              # full implementation plan
├── server/              # Express API + SQLite + matching engine
│   ├── scripts/          # build helpers
│   └── src/
│       ├── index.ts      # entrypoint
│       ├── app.ts        # composition root + middleware order
│       ├── config.ts     # port, origins, database path
│       ├── routes/       # path -> controller wiring
│       ├── controllers/  # request/response handling
│       ├── services/     # domain rules
│       ├── models/       # entity, row mapping, SQL
│       ├── validations/  # Zod contracts
│       ├── matcher/      # matching engine (pure functions)
│       ├── database/     # connection, pragmas, schema.sql
│       ├── middleware/   # error + 404 handlers
│       └── errors/       # ApiError, error body shape
└── client/              # React + Vite frontend
    └── src/
        ├── index.css    # design tokens (light + dark)
        ├── App.tsx
        ├── hooks/
        └── lib/
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

## License

Written as an internship assignment submission.
