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
- `src/lib/csv.ts` — CSV export (issue #27) and import (issue #28), no library dependency:
  `toCsv(rows, columns)` builds file content (RFC 4180 escaping — a field is only quoted if it
  actually contains a comma, quote, or newline), `downloadCsv(filename, content)` triggers a real
  browser download via a `Blob`/object URL, `parseCsv(content)` is a real RFC 4180 parser (handles
  quoted fields, doubled-quote escaping, CRLF/LF) returning raw `string[][]` — column meaning is
  the caller's job, same split as `toCsv`. Export used by `BusinessList` (exports whatever's
  currently filtered/sorted) and `DeadlinesPanel` (exports one business's deadlines). Import used
  by `ImportBusinessesDialog` — header-matched columns (Name/Financial Year End required,
  GST Registered/Reminder Lead/Incorporation Date optional), each valid row submitted through the
  existing single-business `POST /api/businesses` one at a time (no new backend endpoint), with
  per-row real backend error messages shown inline rather than aborting the whole import on one
  bad row.
- `src/components/PrintHeader.tsx` — print-only header (issue #36), hidden on screen (Tailwind's
  `print:` variant), shown only inside `window.print()` output: report title, print date, and the
  "not compliance advice" disclaimer that would otherwise only ever exist on the login page — a
  physical printout has none of the surrounding app to carry that context. Used by
  `DeadlinesPanel` (one business's deadlines) and `CalendarPage` (every business's upcoming
  deadlines, merged). App chrome (nav rail, mobile topbar, ambient background, action buttons, the
  toast layer) is hidden on print via `print:hidden` in `Shell.tsx`/`sonner.tsx`, and `index.css`
  forces plain black-on-white regardless of the active theme — a printout isn't a themed surface.
  `BusinessDetailPage` hides `WorkPassesPanel`/`CustomObligationsPanel` on print too, since only
  the deadlines list is meant to be a printable document — that scoping lives at the page level,
  not baked into either panel.
- `src/components/ui/sonner.tsx` — success toast system (issue #22), a thin wrapper around the
  `sonner` library adapted to read this app's own `theme.ts` instead of the `next-themes` package
  its shadcn registry entry assumes (a Next.js-only dependency this is a plain Vite SPA has no use
  for). Mounted once in `main.tsx`, above every route, so a toast fired from any page — logged out
  or in — has somewhere to render. Fired from every action that previously had no confirmation
  beyond the UI just updating: login, logout, creating/updating/deleting a business, adding/
  removing a work pass, adding/editing/removing a custom obligation. Deliberately *not* added to
  password reset/forgot-password/email-resend, which already show their own persistent inline
  success message — a toast there would just duplicate it.
- `src/lib/theme.ts` — light/dark theme preference (issue #20), a plain `.dark` class on
  `<html>` (index.css's own existing convention, populated since the Harbour Ledger redesign,
  issue #59, ahead of any toggle existing), stored in `localStorage`, falling back to the OS's
  own `prefers-color-scheme` when nothing has been explicitly chosen yet. `index.html` also
  applies it via a small inline script *before* React mounts, so a returning user with dark mode
  chosen never sees a flash of the light theme first — kept manually in sync with this module's
  own storage key, duplicated on purpose since that script has to run synchronously before any
  module loads.
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
  pages via `<Outlet context={...}/>`/`useOutletContext()` — see `src/components/shell/Shell.tsx`'s
  `ShellContext` type.
- `src/components/` is organized **by feature**, not by component type — mirrors the backend's own
  package-by-feature restructure (backend issue #90). Two components sit at the top level rather
  than inside a feature folder, since they're genuinely cross-feature: `FormError` (`role="alert"`
  error message, used by nearly every form across the app) and `UrgencyBadge` (the shared
  color+icon+text urgency indicator, used by deadlines/work-passes/custom-obligations/calendar
  alike). `src/components/ui/` (shadcn/ui primitives, owned code copied in via the shadcn CLI —
  edit freely) is unaffected, staying exactly where it was.
  - `auth/` — `LoginForm` (login/register, toggles between the two — registering no longer logs
    you in directly, since login now requires a verified email; shows a "check your email" screen
    instead, with a resend-verification-email option shown both right after registering and again
    on a later login attempt if the account is still unverified — issues #75/#81), `AuthShell`
    (the split brand-panel + form-panel layout shared by `LoginForm`/`ForgotPasswordPage`/
    `ResetPasswordPage`, issue #69), `ForgotPasswordPage`/`ResetPasswordPage`, `VerifyEmailPage`
    (a lighter, centered single-card treatment — verification is informational-only and
    non-blocking; calls the real `POST /api/auth/verify-email` on mount using the URL's `?token=`).
  - `business/` — `BusinessesPage` (stat tiles + `BusinessList`, the list's own "View" link
    navigates to a business's detail page), `BusinessList` (search/filter/sort, all client-side —
    plus a CSV export of whatever's currently visible, issue #27, and per-row/select-all bulk
    checkboxes with an Export selected/Delete selected action bar, issue #35), `AddBusinessDialog`/
    `EditBusinessPage` (name, FYE, GST status, reminder lead time 1-90 days, optional incorporation
    date), `DeleteBusinessDialog`, `BusinessDetailPage` (`DeadlinesPanel` + `WorkPassesPanel` +
    `CustomObligationsPanel` for one business), `WorkPassesPanel`, `CustomObligationsPanel` (a
    business's own user-defined obligations — a one-off date, or repeats every N months),
    `DeadlinesPanel` (also has its own CSV export, issue #27 — the filename identifies which
    business it's for).
  - `calendar/` — `CalendarPage` (fetches every business's deadlines via `useAllDeadlines` and
    merges them client-side into a month grid + upcoming timeline — no combined backend endpoint
    exists).
  - `notifications/` — `NotificationsPage` (read-only status of which `NotificationSender` channel
    is active, plus a "Notify me in this browser" toggle, issue #34), `BrowserNotificationWatcher`
    (rendered once in `Shell`, no visible UI — polls every business's deadlines and fires a real
    browser `Notification` for one newly within that business's own reminder lead time, deduped
    via `localStorage`; a plain Web Notification, not the full Push API, so it only ever fires
    while the app is actually open in a tab, not a true background push).
  - `account/` — `AccountPage` (registered email, decoded from the JWT's `sub` claim via
    `auth.getEmail()`; a disabled "Change password" control; log out; a Light/Dark appearance
    toggle, issue #20 — this-browser-only via `localStorage`, not synced to the account).
  - `shell/` — `Shell` (the authenticated layout: nav rail, mobile topbar/drawer, ambient
    background, session-expired banner), `NavRail` (the fixed dark sidebar; "Overview"/"Edit
    business" are disabled placeholders until a business is selected), `AmbientBackground` (a
    fixed, low-opacity "depth-sounding" motif — concentric rings + a slow rotating sweep — behind
    all page content, part of the "Harbour Ledger" design, issue #59; respects
    `prefers-reduced-motion`; re-tints per section, issue #63), `StatCard` (summary tiles with a
    `severity` prop driving a top color stripe), `NotFoundPage`, `ErrorBoundary` (top-level React
    error boundary, wrapped around `<App />` in `main.tsx` — catches any otherwise-uncaught render
    error with a "Something went wrong" fallback instead of a blank white screen).

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
