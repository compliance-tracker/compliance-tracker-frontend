# Compliance Tracker — Frontend

Frontend for the [Compliance Tracker](https://github.com/compliance-tracker/compliance-tracker)
backend — a compliance deadline tracker for Singapore SMEs. This is the browser UI: log in,
create businesses, and view their computed compliance deadlines (ACRA Annual Return, GST F5,
work pass renewals).

## Tech stack

| Layer      | Choice                                    |
|------------|--------------------------------------------|
| Framework  | React 19 + TypeScript                       |
| Build tool | Vite                                        |
| Styling    | Tailwind CSS v4                             |
| Components | shadcn/ui                                   |
| Auth       | JWT stored in `localStorage`, attached to every API request |

No routing/state library — the app is small enough (login + one main page) that React's
built-in `useState`/`useEffect` is sufficient; would revisit if the app grows.

## Running locally

Requires the backend running on `http://localhost:8081` (see the
[backend README](https://github.com/compliance-tracker/compliance-tracker/blob/main/README.md))
— this app has no data of its own, everything comes from that API. The backend now requires a
real account — register one via the login screen the first time.

```bash
npm install
cp .env.example .env   # only needed if the backend isn't on the default URL/port
npm run dev
```

Opens on `http://localhost:5173` by default.

## Project structure

- `src/lib/types.ts` — TypeScript types mirroring the backend's JSON shapes exactly
  (`Business`, `Deadline`, `Credentials`, `AuthResponse`) — no transformation layer between the two.
- `src/lib/auth.ts` — stores/retrieves the JWT in `localStorage` (survives a refresh/new tab,
  unlike `sessionStorage`).
- `src/lib/api.ts` — thin fetch wrapper against the backend, base URL from
  `VITE_API_BASE_URL`. Attaches the stored token (if any) to every request automatically.
- `src/components/` — `LoginForm` (login/register, toggles between the two), `StatCard`
  (summary tiles), `BusinessList` (with `EditBusinessDialog`/`DeleteBusinessDialog` actions per
  row), `AddBusinessDialog`, `DeadlinesPanel` (deadlines colored by
  urgency: red ≤30 days, amber ≤90 days, neutral further out), `WorkPassesPanel` (view/add/remove
  a selected business's employee work passes, driving the Employment Pass renewal deadlines,
  same urgency-badge convention as `DeadlinesPanel` — shared logic lives in `src/lib/urgency.ts`).
- `src/components/ui/` — shadcn/ui primitives (owned code, not an npm dependency — copied in
  via the shadcn CLI, edit freely).

## Status

The core flow is fully working: register/log in, add a business, see its real deadlines,
manage its employees' work passes. Auth is enforced by the backend (JWT, every business scoped
to its own owner) — a fresh account starts with an empty list, not everyone else's data. Layout
is a real dashboard (summary stat tiles, side-by-side business list + deadlines panel on wider
screens, urgency-colored deadline badges), not just default component styling. See
[issues on the frontend repo](https://github.com/compliance-tracker/compliance-tracker-frontend/issues)
for current progress.
