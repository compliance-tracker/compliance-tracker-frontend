# Compliance Tracker — Frontend

Frontend for the [Compliance Tracker](https://github.com/Chrainx/compliance-tracker) backend —
a compliance deadline tracker for Singapore SMEs. This is the browser UI: create businesses and
view their computed compliance deadlines (ACRA Annual Return, GST F5, work pass renewals).

## Tech stack

| Layer      | Choice                                    |
|------------|--------------------------------------------|
| Framework  | React 19 + TypeScript                       |
| Build tool | Vite                                        |
| Styling    | Tailwind CSS v4                             |
| Components | shadcn/ui                                   |

No routing/state library — the app is small enough (3 screens' worth of functionality on one
page) that React's built-in `useState`/`useEffect` is sufficient; would revisit if the app grows.

## Running locally

Requires the backend running on `http://localhost:8081` (see the
[backend README](https://github.com/Chrainx/compliance-tracker/blob/main/README.md)) — this app
has no data of its own, everything comes from that API.

```bash
npm install
cp .env.example .env   # only needed if the backend isn't on the default URL/port
npm run dev
```

Opens on `http://localhost:5173` by default.

## Project structure

- `src/lib/types.ts` — TypeScript types mirroring the backend's JSON shapes exactly
  (`Business`, `Deadline`) — no transformation layer between the two.
- `src/lib/api.ts` — thin fetch wrapper against the backend, base URL from
  `VITE_API_BASE_URL`.
- `src/components/` — `BusinessList`, `AddBusinessDialog`, `DeadlinesPanel`.
- `src/components/ui/` — shadcn/ui primitives (owned code, not an npm dependency — copied in
  via the shadcn CLI, edit freely).

## Status

Early — see [issues on the frontend repo] for current progress. Talks to the real backend API
directly; no auth, no multi-tenancy yet (matches the backend's current single-tenant state).
