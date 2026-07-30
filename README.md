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

`react-router` handles the two real URL-addressable pages (password reset's `/forgot-password`,
`/reset-password?token=...` — issue #55); everything else is still a single component tree driven
by `useState`/`useEffect`, no state management library needed yet.

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

```bash
npm run test:e2e
```

Playwright (issue #30) — full-flow browser tests against the real built app (`npm run build` +
`vite preview`, wired into `playwright.config.ts`'s `webServer`), covering auth, nav-rail
routing, and business CRUD. Every backend call is intercepted and mocked at the network layer
(`e2e/mocks.ts`), not a real Spring Boot backend — self-contained, no Docker/Postgres/LocalStack
needed here either. Distinct from the Vitest suite above (component-level, JS-only) and from this
project's convention of ad-hoc scratch Playwright scripts for verifying a specific PR's change
live against the real backend — this is the small, permanent, CI-enforced subset of that kind of
check, not a replacement for it.

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
  every form (login/register, add/edit/delete business, work passes) does this now. Careful to
  not mistake Spring Boot's own default error page for a real `ApiError` — both happen to have
  `error`/`message` string fields, but Spring's version always carries extra keys
  (`timestamp`/`status`/`path`) a genuine `ApiError` body never does; found live when a raw
  Hibernate exception message briefly leaked onto the Verify Email page (issue #69).
- **Routing** (`main.tsx`'s `BrowserRouter`) — `/forgot-password`, `/reset-password?token=...`,
  `/verify-email?token=...` (issues #55/#69), and everything else under `App`, which (once
  authenticated) renders a persistent `NavRail` + routed pages (issue #61): `/businesses` (list),
  `/calendar` (every business's deadlines merged into one month grid + upcoming timeline, issue
  #63), `/businesses/:id` (a business's deadlines, work passes, and custom obligations), `/businesses/:id/edit`
  (edit/delete), `/account` (registered email, a disabled "Change password" control, log out —
  issue #67), `/notifications` (which reminder channel is currently active — issue #73), and a
  404 fallback for anything else. Page-level state (the fetched businesses
  list, create/update/delete handlers, `onLogout`) is owned by `App` and passed down to routed
  pages via `<Outlet context={...}/>`/`useOutletContext()` — see `src/components/Shell.tsx`'s
  `ShellContext` type.
- `src/components/` — `LoginForm` (login/register, toggles between the two — registering no
  longer logs you in directly, since login now requires a verified email; shows a "check your
  email" screen instead, with a resend-verification-email option, issue #75), `NavRail` (the fixed
  dark sidebar; "Overview"/"Edit business" are disabled placeholders until a business is
  selected, real links once one is; an off-canvas drawer below the `lg` breakpoint — a hamburger
  topbar in `Shell.tsx` toggles it, closing automatically on navigation or a backdrop tap, issue
  #71), `CalendarPage` (fetches every business's deadlines and
  merges them client-side — no combined backend endpoint exists), `StatCard` (summary tiles, with a `severity` prop driving a
  top color stripe), `BusinessesPage` (stat tiles + `BusinessList`, the list's own "View" link
  navigates to a business's detail page), `BusinessList` (search by name, filter by GST status,
  sort by name/FYE with a direction toggle, all client-side over the already-fetched list),
  `AddBusinessDialog` (name, financial year end, GST status, reminder lead time in days — defaults
  to 14, 1-90 — and an optional incorporation date, used to validate a first financial year
  doesn't run more than 18 months past incorporation), `BusinessDetailPage` (`DeadlinesPanel` +
  `WorkPassesPanel` for one business — deadlines colored by urgency: red ≤30 days, amber ≤90 days,
  neutral further out; work passes drive the Employment Pass renewal deadlines, same urgency-badge
  convention, shared logic in `src/lib/urgency.ts`; removing a work pass requires confirming
  first), `CustomObligationsPanel` (a business's own user-defined obligations beyond ACRA/GST/work
  passes — a one-off date, or repeats every N months; add/edit/delete, same
  confirm-before-removing pattern as work passes), `EditBusinessPage` (a full page — the old `EditBusinessDialog` modal's replacement —
  plus a danger-zone delete reusing `DeleteBusinessDialog`'s confirmation), `AccountPage`
  (registered email — decoded from the JWT's `sub` claim via `auth.getEmail()`, no separate
  "current user" API call needed — a disabled "Change password" control, and log out, moved here
  from a temporary placeholder button on the nav rail once this page existed to hold it),
  `AuthShell` (the split brand-panel + form-panel layout shared by `LoginForm`/
  `ForgotPasswordPage`/`ResetPasswordPage`, issue #69), `VerifyEmailPage` (a lighter, centered
  single-card treatment instead — verification is informational-only and non-blocking, so it
  doesn't carry the same visual weight as a real auth gate; calls the real
  `POST /api/auth/verify-email` on mount using the URL's `?token=`), `NotificationsPage`
  (read-only — which `NotificationSender` channel is active and, if email, its from-address;
  app-level server config, not a per-account setting, and deliberately no "recently sent" history
  table since no backend endpoint exists for that — issue #73).
- `src/components/ui/` — shadcn/ui primitives (owned code, not an npm dependency — copied in
  via the shadcn CLI, edit freely).
- `src/components/ErrorBoundary.tsx` — top-level React error boundary, wrapped around `<App />`
  in `main.tsx`. Catches any otherwise-uncaught render error and shows a "Something went wrong"
  fallback with a reload button instead of a blank white screen.
- `src/components/AmbientBackground.tsx` — a fixed, low-opacity "depth-sounding" motif (concentric
  rings + a slow rotating sweep) behind all page content, part of the "Harbour Ledger" design
  (issue #59). Respects `prefers-reduced-motion` via Tailwind's `motion-safe:` variant. Re-tints
  per section (issue #63) — teal by default, brass on a business's own pages, brick-red on
  Calendar — decided by `Shell.tsx` from the current route.

## Design system

The app follows a "Harbour Ledger" visual identity (issue #59, sourced from a design mockup) —
deep marine teal + brass accents over cool chart-paper neutrals, replacing the previous generic
shadcn preset. Tokens live in `src/index.css`'s `:root`/`.dark` blocks (OKLCH). Serif
(`font-serif`) is used sparingly, only on page-level `<h1>` titles and the brand wordmark — not
card headers or body copy. Monospace (`font-mono`) is used on every date and countdown figure
(e.g. "18d left") so numbers read as measured ledger entries, but never on plain status/prose
badges. A hairline (`border-b`) sits beneath every page header, and stat tiles carry a thin
top color stripe encoding severity (teal default, amber for "due soon", brick for "overdue").
The app's persistent `NavRail` and every auth page's `AuthShell` brand panel share one fixed
dark "harbour" navy, never theme-swapped, unlike the rest of the app's `:root`/`.dark` tokens —
the one visual constant across the whole product, like a ledger's bound cover.

## Status

The core flow is fully working: register/log in, add a business, see its real deadlines,
manage its employees' work passes. Auth is enforced by the backend (JWT, every business scoped
to its own owner) — a fresh account starts with an empty list, not everyone else's data. The
authenticated app is a real multi-page layout now, not a single dashboard — a persistent nav rail
(fixed dark "harbour" sidebar) plus routed pages for the business list, a business's own
deadlines/work-passes detail, and editing/deleting a business, with a 404 fallback for anything
else. A top-level error boundary catches any otherwise-uncaught render error with a friendly
fallback rather than a blank screen, styled per the "Harbour Ledger" design system above. Each
business has its own configurable reminder lead time (1-90 days, default 14, set in
`AddBusinessDialog`/`EditBusinessPage`, shown in the business list). An optional incorporation
date can be set on creation, validated against a real first-year ACRA rule (Companies Act 1967
s.198's 18-month cap) with the backend's actual rejection reason shown, not a generic error —
every form in the app now shows the backend's real error message where one exists (login/
register, business create/edit/delete, work pass add/remove), including a work-pass removal
that fails after already being optimistically removed from the list, which now restores the row
instead of leaving the UI out of sync with the server. A full "forgot your password?" flow now
exists too — a neutral "check your inbox" page that never reveals whether an email exists, and a
real reset-password page reached via an emailed link's token, both showing the backend's actual
rejection reason (invalid/expired token, weak new password) rather than a generic error. Email
verification (`/verify-email?token=...`) is now actually required, not just informational —
registering shows a "check your email" screen instead of logging you in directly, and logging in
before verifying is rejected with a real, specific message rather than a generic "incorrect email
or password." **The Harbour Ledger redesign is now fully complete**: design tokens, nav rail +
routed pages (including an off-canvas mobile drawer), Calendar, Account, Notifications, and the
auth pages all match the mockup — every page was deliberately deferred rather than built with
invented data when its backend support didn't exist yet (Notifications waited on backend issue
#114), and each landed for real once that support shipped. See
[issues on the frontend repo](https://github.com/compliance-tracker/compliance-tracker-frontend/issues)
for current progress.
