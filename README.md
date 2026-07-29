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
| Auth       | JWT (access + refresh pair) stored in `localStorage`, access token attached to every API request |

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

## Testing

```bash
npm test
```

Vitest + React Testing Library — no backend/Docker needed, everything's mocked. `npm run test:watch`
for watch mode during development.

## Project structure

- `src/lib/types.ts` — TypeScript types mirroring the backend's JSON shapes exactly
  (`Business`, `Deadline`, `Credentials`, `AuthResponse`) — no transformation layer between the two.
- `src/lib/auth.ts` — stores/retrieves both the access and refresh JWTs in `localStorage`
  (survives a refresh/new tab, unlike `sessionStorage`).
- `src/lib/api.ts` — thin fetch wrapper against the backend, base URL from
  `VITE_API_BASE_URL`. Attaches the stored access token (if any) to every request automatically.
  On a `401`, transparently exchanges the refresh token for a new pair and retries once before
  giving up — a real session only actually ends (bounced to the login screen with an explanation)
  if that refresh fails too, not on the access token's first expiry. Throws an `ApiRequestError`
  (carrying the backend's real `{error, message}` body) on any other non-2xx response where the
  backend actually sent one, so a caller can show the genuine reason instead of a generic string —
  every form (login/register, add/edit/delete business, work passes) does this now.
- `src/components/` — `LoginForm` (login/register, toggles between the two), `StatCard`
  (summary tiles), `BusinessList` (search by name, filter by GST status, sort by name/FYE with a
  direction toggle — all client-side over the already-fetched list, plus each business's own
  reminder lead time and `EditBusinessDialog`/`DeleteBusinessDialog` actions per row),
  `AddBusinessDialog` (name, financial year end, GST status, reminder lead time in days —
  defaults to 14, 1-90 — and an optional incorporation date, used to validate a first financial
  year doesn't run more than 18 months past incorporation), `DeadlinesPanel` (deadlines colored by
  urgency: red ≤30 days, amber ≤90 days, neutral further out), `WorkPassesPanel` (view/add/remove
  a selected business's employee work passes, driving the Employment Pass renewal deadlines,
  same urgency-badge convention as `DeadlinesPanel` — shared logic lives in `src/lib/urgency.ts`).
- `src/components/ui/` — shadcn/ui primitives (owned code, not an npm dependency — copied in
  via the shadcn CLI, edit freely).
- `src/components/ErrorBoundary.tsx` — top-level React error boundary, wrapped around `<App />`
  in `main.tsx`. Catches any otherwise-uncaught render error and shows a "Something went wrong"
  fallback with a reload button instead of a blank white screen.

## Status

The core flow is fully working: register/log in, add a business, see its real deadlines,
manage its employees' work passes. Auth is enforced by the backend (JWT, every business scoped
to its own owner) — a fresh account starts with an empty list, not everyone else's data. Layout
is a real dashboard (summary stat tiles, side-by-side business list + deadlines panel on wider
screens, urgency-colored deadline badges), not just default component styling. A top-level error
boundary catches any otherwise-uncaught render error with a friendly fallback rather than a blank
screen. Each business has its own configurable reminder lead time (1-90 days, default 14, set in
`AddBusinessDialog`/`EditBusinessDialog`, shown in the business list). An optional incorporation
date can be set on creation, validated against a real first-year ACRA rule (Companies Act 1967
s.198's 18-month cap) with the backend's actual rejection reason shown, not a generic error —
every form in the app now shows the backend's real error message where one exists (login/
register, business create/edit/delete, work pass add/remove), including a work-pass removal
that fails after already being optimistically removed from the list, which now restores the row
instead of leaving the UI out of sync with the server. See
[issues on the frontend repo](https://github.com/compliance-tracker/compliance-tracker-frontend/issues)
for current progress.
