# Compliance Tracker — Frontend

See `../CLAUDE.md` for overall project purpose and how I want to collaborate — this file only
covers frontend-specific details. I'm new to this stack entirely (no prior React/frontend
experience) — explain framework concepts, not just Java/Spring ones.

## Tech stack (decided, don't change without discussing)

- **Framework:** React 19 + TypeScript
- **Build tool:** Vite
- **Styling:** Tailwind CSS v4 (uses the `@tailwindcss/vite` plugin, not the older PostCSS config style)
- **Components:** shadcn/ui — components are copied into `src/components/ui/` via its CLI, not an npm dependency; edit them freely, they're owned code
- **Routing**: `react-router` (issue #55), added specifically because password reset needs a real URL (`/reset-password?token=...`) to carry a token from an email link — `main.tsx` wraps everything in a `BrowserRouter`/`Routes`; only `/forgot-password` and `/reset-password` are actual routes, `App` itself still owns everything else (the login screen and the authenticated dashboard) exactly as before, not restructured into nested routes of its own. No state management library — `useState`/`useEffect` is still enough for everything else; revisit if that changes
- Calls the backend directly (`src/lib/api.ts`), no BFF/proxy layer
- **Auth:** JWT access + refresh pair stored in `localStorage` (`src/lib/auth.ts`), access token attached to every request in `api.ts`'s `request()` helper — no auth context/provider, just plain modules with get/set/clear functions and a module-level `registerSessionExpiredHandler` callback for the one place (`App.tsx`) that needs to react to a session actually ending

## Current environment

- Node v22, npm v10
- Project lives at `~/Documents/Projects/compliance-tracker/frontend`
- Needs the backend running on `http://localhost:8081` (with its own Docker deps up) to do anything real — this app has no data of its own

## Known gotchas already hit

- **CORS**: the backend blocks browser requests from a different origin by default — needed an explicit `CorsConfig` on the backend side (backend issue #15/PR #16) before this frontend could talk to it at all. curl/Postman were never affected since CORS is a browser-enforced rule.
- **shadcn CLI is a different generation than older tutorials describe** — this version uses `-t vite -b radix -p nova` flags (template/base/preset), not the older simpler prompts. `npx shadcn@latest init --help` to see current options if this breaks again on an upgrade.
- **TypeScript's `baseUrl` compiler option is deprecated** in newer TS versions — use `paths` alone (no `baseUrl`) for the `@/*` import alias in `tsconfig.json`/`tsconfig.app.json`.
- **Vitest, not Jest** — reuses this project's existing `vite.config.ts` directly (same `@/*` alias, same plugins), added under a `test:` key. Deliberately did **not** turn on Vitest's `globals` option — `describe`/`it`/`expect` are imported explicitly per test file, so `tsconfig.app.json` never needs test-only globals added just to keep test files compiling. That choice has one real consequence to remember: React Testing Library's auto-cleanup between tests depends on `globals` being on to auto-detect a global `afterEach` — with it off, `afterEach(cleanup)` has to be registered explicitly (done once, in `src/test/setup.ts`) or renders silently stack across tests in the same file. Hit this for real writing the first component test, not hypothetically — see NOTES.md §4e.
- **The backend now requires auth on every business endpoint** (backend #19) — a request with no/invalid token gets a 401. `api.ts`'s `request()` treats a 401 from `getBusinesses` specially in `App.tsx` (clears the stored token, bounces back to the login screen) rather than showing a generic "can't reach backend" error, since those are two different problems.
- **`request<T>()` unconditionally called `response.json()`** — worked fine until the work pass DELETE endpoint (`204 No Content`, empty body) came along, which threw a `SyntaxError` parsing nothing. First fix short-circuited on `response.status === 204` specifically; when logout (issue #41) came along returning `200` with an *also*-empty body, that status-code special-casing didn't cover it. Generalized instead: read the response as `text()` first, only `JSON.parse` if non-empty — covers any current or future no-body response regardless of status code, not just the ones anticipated one at a time.
- **A saved HTML design mockup (separate artifact, not in this repo) explored a richer visual language than a few real components had** — restyled the existing ones to match (uppercase table headers, a urgency badge on work passes, a segmented login toggle), but deliberately skipped anything the mockup showed with no real data/backend behind it (a "Pass type" column with no matching field, whole new pages like Admin rules/Account/Notifications/404 — tracked separately as frontend issue #39). If asked to "match the design" again, check whether what's being asked for actually has real data behind it before adding it.
- **A sibling component's `useEffect` won't refetch just because *related* data changed elsewhere** — `DeadlinesPanel`'s effect only depends on `business`, so adding/removing a work pass in the separate `WorkPassesPanel` never triggered a refetch (found via user testing, not by me — my own Playwright check only looked at `WorkPassesPanel`'s own table, not whether `DeadlinesPanel` picked up the new deadline). Fixed with a `refreshKey` counter lifted to `App.tsx`, bumped via an `onWorkPassesChanged` callback. General lesson: when two components both derive from the same backend state but fetch independently, changing one's data doesn't automatically refresh the other — check for this explicitly whenever a mutation in one panel should be reflected in a sibling.
- **Visual polish alone didn't fix "feels empty"** — a color accent + shadows pass still read as sparse; the actual fix was structural (stat tiles, wider container, side-by-side grid instead of a stacked single column). Layout/information-density matters more than color for "does this look like a real product."
- **Labels**: added `area:ui`/`area:auth`/`area:infra`/`area:testing` to this repo, matching the backend's `area:*` convention (previously every issue just had the generic `enhancement` label with no further categorization).
- **A `fetch()` 401 in a real browser is not the same thing a mocked test sees** — found live via Playwright, not hypothetically, while building #17: the backend's CORS config used to be MVC-level only, which never applied to a response Spring Security's own filter chain rejected early (the exact case a `401` for an expired token is). That meant a real cross-origin `fetch()` against a `401` didn't resolve with a readable `Response` at all — it rejected with an opaque "blocked by CORS policy" error, invisible as a `401` to any `err.message.includes("401")` check. Unit tests never caught this because mocked `fetch` always returns a normal `Response` regardless of CORS. Fixed on the backend side (issue #83) by moving CORS to Security-level. Worth remembering: a Playwright check against a *real* running backend is the only thing that can catch this class of bug — a component test with a mocked `fetch`, however thorough, cannot.
- **jsdom doesn't implement Pointer Events methods (`hasPointerCapture`/`setPointerCapture`/`releasePointerCapture`) or `scrollIntoView`, which Radix primitives (e.g. `Select`) call internally** — opening a Radix `Select` in a test throws `TypeError: ... is not a function` without a fix. A known, widely-documented gap in the Radix+jsdom+testing-library combination, not a bug in this app's code. Fixed once, centrally, in `src/test/setup.ts` with no-op polyfills for all four (guarded by `typeof ... === "undefined"` so a future jsdom that does implement them isn't silently overridden) — any future test using a Radix primitive that relies on pointer capture benefits automatically, no per-test workaround needed.
- **A too-loose Playwright wait condition can hide the exact bug you're trying to catch** — the first pass at #17's live-verification script waited for `text=Compliance Tracker`, which appears on the login screen's own branding panel *and* the post-login dashboard header, so the script raced ahead and ran its "force an invalid token" step before registration had actually completed. That made the check pass for the wrong reason. Fixed by waiting for something that only exists post-auth (the "Add business" button) instead. General lesson: a suspiciously-fast Playwright "pass" deserves the same scrutiny as a failure — check what the wait condition can actually match before trusting the result.

## Project status

Issues #1 (scaffold), #2 (business list + add form), #3 (deadlines view), #5 (CI workflow), #8 (login/register UI), #13 (visual polish/dashboard layout) are all closed and merged (PR #12). Backend PR #23 (auth) is merged too — both `main`s now work together end to end: register, add a business, see real deadlines.

The login page went through three passes before it stopped feeling "empty"/generic: (1) a bare centered card → (2) split layout with a branding/value-prop panel → (3) that panel's flat solid-color fill became a gradient with decorative blurred shapes plus `justify-between` spacing so content fills the full height. Worth remembering that a single "add some color" pass often isn't enough — layout/spacing and depth matter as much as color choice.

Repo GitHub org/URLs were stale in this file and README.md for a while after the `Chrainx` → `compliance-tracker` org transfer — fixed, but worth double-checking any hardcoded repo URLs if this happens again.

#15 (work pass management UI — `WorkPassesPanel.tsx`, depends on backend #24) is done, verified live via Playwright (add/list/delete a work pass, no console errors).

A fourth login-page pass added a segmented "Log in"/"Sign up" pill toggle (replacing a plain text link) plus uppercase table headers and a work-pass renewal urgency badge, matching a saved design mockup — see NOTES.md §4c. Frontend issue #39 tracks the remaining mockup pages that don't have real functionality behind them yet (Admin rules, Account, Notifications status, Businesses list, 404) — not built.

`handleLogout` now calls the real `POST /api/auth/logout` (backend issue #41) before clearing local state, best-effort (`try`/`catch`, always clears locally regardless of the server call's outcome). Verified live: watched the actual network request the button fires, confirmed the token it revokes genuinely stops working on the very next request — not just that a request went out.

#16 (edit/delete business UI, depends on backend #25) is done — `EditBusinessDialog`/`DeleteBusinessDialog`, wired as icon-button actions on each `BusinessList` row. Verified live via Playwright: edited a business's name and FYE, confirmed the deadlines panel's own ACRA date actually recalculated from the new FYE (not just that the row text changed); confirmed Cancel on the delete confirmation genuinely doesn't delete anything; confirmed a real delete falls the app back to its empty state cleanly.

#9 (test suite) is done — Vitest + React Testing Library, 23 tests across `urgency.test.ts`, `api.test.ts`, and `LoginForm.test.tsx`, wired into CI as a new step in the existing `build-and-typecheck` job (not a new job — branch protection requires that exact check name). See NOTES.md §4e for the setup itself and a real bug it caught along the way (an ambiguous "Log in" button match, since the submit button's text collides with the segmented toggle's).

#17 (handle token expiry gracefully, the frontend counterpart to backend #26) is done: `api.ts`'s `request()` now transparently exchanges the refresh token for a new access/refresh pair on any `401` and retries the original call once, before ever bouncing the user out — a real session only ends (back to the login screen, with a visible "Your session expired. Please log in again." message) if that refresh fails too. Along the way, found and got fixed on the backend a real CORS bug (issue #83, backend PR #84) that silently broke both this new logic and the old pre-#26 401-handling: a `401` response never carried CORS headers in a real browser, so `fetch()` couldn't see the status code at all, only an opaque network failure — a mocked-`fetch` unit test could never have caught this, only a live Playwright run against the real backend did. Verified live twice: once forcing an invalid access token with a valid refresh token (silent refresh + retry succeeds, user never sees anything), once forcing both invalid (bounced to login with the expected message, tokens cleared).

#18 (search/sort/filter on the business list) is done — all client-side over the already-fetched list (search by name, filter by GST status, sort by name/FYE with a direction toggle), using shadcn's `select` component added for the first time in this repo. Two distinct empty states (no businesses at all vs. no matches for the current search/filter). See NOTES.md §4g for the jsdom/Radix `Select` testing gap it surfaced (fixed centrally in `src/test/setup.ts`, benefits any future Radix-primitive test). Verified live via Playwright with three real businesses.

#46 (consume backend's new paginated response envelope, the frontend counterpart to backend #49)
is done — backend #49 changed `GET /api/businesses`/`GET /api/businesses/{id}/work-passes` from a
bare array to a `PageResponse<T>` envelope, which broke the live business list the moment that
backend PR merged (a deliberate, discussed-first breaking change, same pattern as prior
backend/frontend pairs). Fixed narrowly inside `api.ts`'s `getBusinesses`/`getWorkPasses`
themselves (`.then((page) => page.content)`), so every existing caller keeps getting a plain
array unchanged — no call-site changes needed. See NOTES.md §4h. Verified live via Playwright
against the real backend (registered, added a business, confirmed it renders with zero console
errors) — a mocked-`fetch` unit test alone can't prove the real endpoint's shape actually matches
what the mock assumes.

#23 (React error boundary) is done — `src/components/ErrorBoundary.tsx`, wrapped around `<App />`
in `main.tsx`. Has to be a class component (`static getDerivedStateFromError` +
`componentDidCatch`) since error boundaries have no hook equivalent yet, the one deliberate
exception to this codebase otherwise being all-functional components. A single boundary at the
top for the whole app, not one per panel — revisit only if a future feature makes losing one
broken panel while keeping the rest alive actually worth the extra complexity. See NOTES.md §4i.

#49 (expose backend #53's configurable per-business reminder lead time) is done — `leadTimeDays`
added to `Business`/`NewBusiness` in `types.ts`; a number input (1-90, default 14) in both
`AddBusinessDialog` and `EditBusinessDialog`; a new "Reminder lead" column in `BusinessList`
(previously invisible once set — the only way to see it at all was reopening the edit dialog).
Verified live via Playwright: created a business with a 45-day lead time, confirmed it persisted
and rendered in the table, reopened the edit dialog and confirmed the field pre-filled with 45
(not a stale default), changed it to 7, confirmed the table updated — zero console errors
throughout.

#51 (expose backend #31's first-year ACRA incorporation-date validation) is done — an optional
`incorporationDate` date input added to both `AddBusinessDialog` and `EditBusinessDialog`
(preserved-if-omitted on update, matching the backend, and deliberately not re-validated there
either — only creation actually enforces the 18-month rule). Along the way, fixed a real
pre-existing gap this surfaced: `api.ts`'s `request()` used to discard the backend's structured
`{error, message}` body entirely on any non-2xx response, so every form just showed one
hardcoded string regardless of what the backend actually said — which would have made the new
validation's specific message pointless. Added `ApiRequestError` (carries the real `message`/
`error` code) and had `AddBusinessDialog`/`EditBusinessDialog` show it when present, falling back
to the old generic string only for non-`ApiError` failures (network error, backend down). Every
*other* form (`LoginForm` etc.) still swallows its real message — tracked separately as #52,
deliberately not swept in this same change since it's a bigger, unrelated-to-this-feature sweep.
Verified live via Playwright: created a business with a genuinely violating combination
(incorporated 2026-01-01, FYE 2027-12-31 — over 18 months later) and confirmed the real backend
message appeared verbatim, not a generic one; fixed the FYE to a valid date and confirmed
creation then succeeded.

#52 (sweep every other form onto real backend error messages, the follow-up left out of #51 on
purpose) is done — `LoginForm`, `DeleteBusinessDialog`, and `WorkPassesPanel`'s add/remove paths
all now show `err.message` when the catch is an `ApiRequestError`, falling back to the old
generic string only for a non-`ApiError` failure (network error, backend down). `LoginForm`'s
old hardcoded per-mode message ("that email may already be taken" for *any* register failure)
was actively misleading — a weak-password `400` used to show that same wrong reason; now it
shows the backend's real, specific message instead, and same for a genuine `409` email conflict.
Also found and fixed a real, separate latent bug while touching `WorkPassesPanel`:
`handleDelete`'s optimistic row removal had no error handling at all — a failed delete left the
UI silently out of sync with the server (the row gone client-side, still present in the
database) with an unhandled promise rejection besides. Added a rollback (`setWorkPasses(previous)`
on catch) plus the same real-message display. Verified live via Playwright: weak-password
registration, a real duplicate-email conflict, and a wrong-password login all showed their exact
real backend messages; a work-pass delete forced to fail via route interception (a genuine
500 with a structured body) confirmed the row visually reappears and the real message shows,
not just that the code compiles.

#55 (password reset UI, backend #37's frontend counterpart) is done — the first real
architectural change since scaffolding: `react-router` added specifically because a reset link
needs a genuine URL to carry its token (`/reset-password?token=...`), which the previous
`useState`-only approach had no way to handle. Discussed with the user first (a real stack
change, per this file's "don't change without discussing" rule) — chose adding a proper router
over hand-parsing `window.location.search`, since this is exactly the "revisit if it grows" case
the original no-router decision anticipated. Scope stayed narrow: only `/forgot-password` and
`/reset-password` are actual routes (`ForgotPasswordPage`/`ResetPasswordPage`); `App` itself is
unchanged, still just rendered at `/*` and still owns the login screen and dashboard directly,
not restructured into nested routes of its own. `ForgotPasswordPage` always shows the same
neutral "if an account exists..." message regardless of outcome (matching the backend's
enumeration-avoidance design) — including on a network failure, which needed an explicit `catch`
block to swallow (an unhandled-rejection warning surfaced this during testing; a bare
`try/finally` with no `catch` doesn't actually stop the rejection from propagating). A "Forgot
password?" link was added to `LoginForm` (login mode only). One test-infra gotcha: `LoginForm`'s
existing tests all needed wrapping in `MemoryRouter` once it started rendering a real `<Link>` —
a `<Link>` outside any router context throws, not just fails an assertion.

Verified live end-to-end via a scratch Playwright script: registered an account, requested a
reset (confirmed the neutral message), read the real token straight out of Postgres (email isn't
actually delivered locally — `LoggingNotificationSender`/`AuthEmailSender` just log it), visited
the real `/reset-password?token=...` URL as if clicking the emailed link, reset the password,
confirmed the old password now fails and the new one works, and confirmed reusing the same
(single-use) token a second time is correctly rejected. `npm audit` flags `react-router` for a
CSRF-bypass advisory scoped to its RSC (React Server Components) framework mode specifically —
this app is a plain Vite SPA using neither RSC nor framework mode, so the advisory doesn't apply
to how it's actually used here; not treated as blocking, but worth re-checking if this ever
changes (e.g. a future move to a meta-framework).

#56 (email verification UI, backend #36's frontend counterpart) is filed but not started — lower
priority since nothing currently enforces `emailVerified` on the backend either.

#24 (confirmation before destructive actions) is done — its business-delete half already existed
(`DeleteBusinessDialog`, from #16), so the only real remaining gap was work-pass removal, which
used to delete on a single click with no confirmation at all. `WorkPassesPanel` now tracks a
`pendingDelete: WorkPass | null` and opens a small confirm dialog (mirroring
`DeleteBusinessDialog`'s Cancel/"Yes, remove" pattern) instead of calling `handleDelete`
directly from the trash icon's `onClick`. Verified live via Playwright: clicking the trash icon
does not delete immediately, Cancel leaves the row untouched, and confirming actually removes it
— three separate real assertions, not just that a dialog renders.

**"Harbour Ledger" redesign (tracked under #39, decided: full nav-rail + IA restructure, not just
a reskin — see NOTES.md §4p for the full breakdown and design-handoff source).** Step 1, #59
(design tokens + typography foundation), is done — `index.css`'s `:root`/`.dark` swapped from the
generic shadcn nova preset to the harbour teal/brass palette (both light and dark populated, even
though dark mode has no toggle yet — issue #20 — so it's ready the moment one exists); `font-serif`
applied only to `App.tsx`'s page `<h1>` (deliberately NOT to `--font-heading`/`CardTitle`, which
would've put serif on every card header, contradicting the "used sparingly" intent); `font-mono`
on every date cell and countdown badge (`urgency.ts`, `BusinessList`, `DeadlinesPanel`,
`WorkPassesPanel`); a ledger hairline (`border-b`) under `App.tsx`'s header; `AmbientBackground`
(fixed rings + rotating sweep, single teal tint — no per-section re-tint yet, that needs the
route-aware "which section" state the nav-rail step introduces) mounted once; `StatCard` gained a
`severity` prop driving a top color stripe. Found and fixed a real regression along the way:
`LoginForm`'s brand-panel gradient had hardcoded blue/violet OKLCH endpoints from the *old*
palette that clashed outright once `--primary` changed underneath them — not fixed with the full
mockup brand-panel treatment (that's its own later phase, step 7 below) but re-tinted to the same
teal family so it isn't visibly broken in the meantime. Explicitly NOT building the mockup's
Admin Rules page as part of any of this — no backend rule-override API exists at all (confirmed:
only `auth`/`business`/`workpass` controllers), and the design-handoff doc is explicit that a page
with no real backend behind it shouldn't get built; stays tracked separately under #21.

Step 2, #61 (nav rail + route-based navigation), is done — the single dashboard is now a real
multi-page app: `/businesses` (list, stat tiles + `BusinessList` — its row actions dropped to a
single "View" link), `/businesses/:id` (`BusinessDetailPage`, combining `DeadlinesPanel` +
`WorkPassesPanel` — the redesigned IA has no separate per-business deadlines page, cross-business
deadlines live in Calendar, a later step, so this is a deliberate deviation from the mockup's
literal page split, not a dropped feature), `/businesses/:id/edit` (`EditBusinessPage`, a full
page replacing `EditBusinessDialog`'s modal, with a danger-zone delete reusing
`DeleteBusinessDialog`, repurposed from an icon-trigger to a full button), and a 404 fallback
(`NotFoundPage`) for anything else. `NavRail` reads the current `:id` via `useParams()` (works
from a layout route's `element`, not just the leaf, since react-router v6 merges params across
the whole matched branch) to decide whether "Work passes"/"Edit business" are real links or
disabled placeholders. `App` itself now only owns auth gating + the businesses list/CRUD
handlers, passed to routed pages via `<Outlet context={...}/>`/`useOutletContext()`
(`Shell.tsx`'s `ShellContext`) rather than a new Context API. Deliberately did NOT drop the
ability to log out just because the mockup's "Log out" button lives on the not-yet-built Account
page — pinned a working one to the bottom of the nav rail as a documented placeholder instead.
Verified live via Playwright: the full flow end-to-end (register → land on `/businesses` →
nav-rail items disabled with no business selected → create a business → View → nav-rail items
become real links → Edit business → save → redirected back to the detail page with the update
reflected → a bad URL shows 404 → a well-formed but nonexistent business id shows "Business not
found" — zero console errors throughout).

Remaining steps (not started): Calendar page (#19) → Account page → Notifications status page
(read-only channel info only, no history table — no backend endpoint for that) → reskin the auth
pages properly + build Verify Email (#56).

Open (not started): #7 (deploy — depends on backend #5).

See `README.md` and GitHub issues for full detail; don't duplicate that detail here.
