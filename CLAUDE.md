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

- **`src/components/` is no longer one flat folder** — reorganized by feature (mirroring the backend's own package-by-feature restructure, backend issue #90): `auth/`, `business/`, `calendar/`, `notifications/`, `account/`, `shell/`, plus `FormError.tsx`/`UrgencyBadge.tsx` staying at the top level since they're genuinely cross-feature, and `ui/` (shadcn primitives) unaffected. A new component needs to go in the right feature folder — no compiler package-declaration equivalent here (this is TypeScript, not Java), so a misplaced file won't fail to compile, it'll just be organizationally wrong; check the existing folders for where a similar component already lives before creating a new one. Every existing import already used the `@/components/...` alias (never a relative `./Foo` import between components), which is what made this move mechanical — a bulk find/replace on `@/components/<Name>` → `@/components/<folder>/<Name>` was enough, no per-file reasoning needed. Any *historical* status paragraph elsewhere in this file predating the reorg may still cite the old flat path (e.g. `src/components/ErrorBoundary.tsx`) — those are stale, not wrong about what the component does, just where it now lives.
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
- **jsdom also doesn't implement `ResizeObserver`, which Radix `Checkbox` (via `react-use-size`) calls internally** — same class of gap as the pointer-capture one above, found live building #77's `CustomObligationsPanel` (the first place a Radix `Checkbox` gets exercised via `userEvent` inside a real controlled dialog render). Fixed the same way — a no-op `ResizeObserver` class in `src/test/setup.ts`, guarded the same way. Any future jsdom-environment error naming a browser API Radix calls internally is probably this same pattern — check `src/test/setup.ts` first before assuming it's a real bug.
- **jsdom doesn't implement `window.matchMedia` at all** — `src/lib/theme.ts` (issue #20) calls it to fall back to the OS's `prefers-color-scheme` when no explicit theme choice exists yet. Same jsdom-gap family as `ResizeObserver`/pointer-capture above; fixed with a default "doesn't match anything" stub in `src/test/setup.ts`, guarded the same way — individual tests exercising the actual OS-preference behavior override it with `vi.spyOn` instead of relying on the stub.
- **A raw `element.click()` in a test doesn't guarantee React's batched state update has actually committed by the time the next assertion runs** — only `fireEvent.click()`/`userEvent` (both wrap the call in `act()`) guarantee that. `AccountPage.test.tsx`'s pre-existing Log-out test got away with plain `.click()` since it only asserts a mock was called (synchronous, no re-render involved) — its new Appearance-toggle tests (issue #20), which assert on `aria-pressed` changing after a click, needed `fireEvent.click()` instead. Any future test asserting on a DOM attribute/text that only changes *after* a state update needs `fireEvent`/`userEvent`, not a raw `.click()`.
- **A toast whose text includes a name also shown on the page can make an existing `getByText` assertion ambiguous** — found via CI's own E2E job, not local testing, when issue #22 added a "`<name>` added" success toast: `e2e/businesses.spec.ts`'s existing `getByText("Playwright Test Co")` assertion started matching both the real table cell and the toast at once (Playwright's strict mode correctly refuses to guess), even though nothing was actually broken. Fixed by scoping that assertion to `getByRole("cell", ...)`. Any future toast/UI text pairing sharing the same literal string is a fresh candidate for this — prefer a role-scoped query over a plain `getByText` for anything that also appears in a toast.
- **A `<div>` wrapper added around an already-`position: fixed` component becomes a real, unintended CSS Grid item itself, even though the component it wraps was never part of the grid's flow at all** — `Shell.tsx`'s root is `lg:grid lg:grid-cols-[220px_1fr]` (nav rail column + main column); `AmbientBackground`'s own root has always been `fixed`, which removes it from grid flow entirely, so it was harmless as a direct grid child. Issue #36 (print-friendly view) wrapped it in `<div className="print:hidden"><AmbientBackground .../></div>` to hide it from print output — that new wrapper div has no `fixed` positioning of its own and no `lg:hidden` either, so at desktop widths it silently became the grid's *first* real item, pushing the nav rail into the second (`1fr`) column and everything else into an implicit extra row — the entire authenticated app's layout broke (nav rail ballooned to fill most of the page, stat cards/tables squeezed into a ~220px sliver showing only icons) on every page, for every desktop viewport. Found live via a real screenshot, not by any test — the committed E2E suite (issue #30) never caught it, since none of its assertions check actual computed widths/grid placement, only that elements are present/clickable. Fixed (frontend#95) by giving `AmbientBackground` its own `className` prop and passing `print:hidden` directly onto its already-`fixed` root instead of adding a wrapper. General lesson: never wrap a `fixed`/`absolute` element in a plain `<div>` just to attach a class to "it" — the wrapper itself still participates in whatever layout system the parent uses, even if the element inside it doesn't.
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

(#56, email verification UI, was closed retroactively once #69 delivered it under a different
issue number — see below. Backend #120 later made verification actually enforced, not just
informational — see #75 further down.)

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
the whole matched branch) to decide whether "Overview"/"Edit business" are real links or
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

Step 3, #63 (Calendar page, closes #19 too), is done — `CalendarPage` at `/calendar`, reachable
from the nav rail's top-level "Businesses" caption group (unlike "Overview"/"Edit business",
always a real link since it isn't scoped to a selected business). No backend endpoint returns
deadlines across every business at once, so it fetches each business's own
`GET /api/businesses/{id}/deadlines` via `Promise.all` and merges them client-side (fine at this
app's scale — one SME's own businesses). A month grid (urgency-colored dots per day, current
month, "today" highlighted) sits beside an "Upcoming, all businesses" timeline sorted by date
ascending; `OBLIGATION_LABELS` moved from `DeadlinesPanel` into `urgency.ts` (alongside a new
`urgencyTier()` helper) so both places share one source instead of duplicating the map. Also
finally implemented the ambient background's per-section re-tint, deferred from #59 until real
routes existed to know "which section" — `Shell.tsx` derives an `AmbientTint` ("teal" default,
"brass" on `/businesses/:id`(`/edit`), "brick" on `/calendar`) from `useLocation()` and passes it
to `AmbientBackground`, which now takes the tint as a prop instead of hardcoding `--primary`.
Verified live via Playwright: the empty state before any business exists, then two businesses
with real deadlines merging correctly into the timeline (sorted earliest-first regardless of
which business), the month grid rendering, and the brick-red ambient tint actually visible on
this page specifically (confirmed via screenshot, not just that the prop was passed) — zero
console errors.

#65: the "Selected business" nav item pointing to `/businesses/:id` was labeled "Work passes"
even though that page shows `DeadlinesPanel` too (the deliberate #61 combination) — the user
flagged this as reading like a mistake, not an intentional deviation. Renamed to "Overview" to
match what the page actually shows, rather than leaving a technically-correct-but-misleading
label. Verified live that the rename didn't break the disabled→enabled link behavior.

Step 4, #67 (Account page), is done — `/account`, reachable from a new nav-rail "Account" caption
group (always a real link, same as Calendar). Shows the registered email read-only (decoded from
the JWT access token's `sub` claim via a new `auth.getEmail()` — no backend "current user"
endpoint exists or was needed, the frontend already holds everything required), a disabled
"Change password" button with an honest "Coming soon" badge (no backend endpoint for that
either), and Log out. Moved `onLogout` from a separate `Shell` prop into `ShellContext` itself
(passed via `<Outlet context={...}/>`) now that a routed page (`AccountPage`) is what actually
calls it — `NavRail` no longer needs it at all, since its own temporary bottom-pinned Log out
button (added in #61 specifically as a stopgap, commented "to move once Account ships") is
deleted now that its real home exists. Verified live via Playwright: confirmed the nav rail no
longer has any Log out button, the Account page shows the actual registered email (not a
placeholder), the Change-password control is genuinely disabled, and clicking Log out from its
new location still actually logs out and returns to the login screen — zero console errors.

Step 5, #69 (reskin auth pages + build Verify Email), is done — **this closes out the Harbour
Ledger redesign's planned scope**, apart from Notifications (blocked on backend #114, see below).
Extracted a shared `AuthShell` component (the split brand-panel + form-panel layout) used by
`LoginForm`/`ForgotPasswordPage`/`ResetPasswordPage` — previously each had its own near-duplicate:
`LoginForm`'s panel still had the pre-Harbour-Ledger blurred-blob decoration (#59 only recolored
its gradient, never restructured it), while Forgot/Reset used a lighter centered-card treatment
the mockup actually reserves for Verify Email specifically. `AuthShell`'s brand panel gets its own
dot-grid + rings/sweep motif (brass-tinted, fixed navy — same as `NavRail`, never theme-swapped),
distinct from the app's teal `AmbientBackground`. Built `VerifyEmailPage` (`/verify-email?token=...`,
a standalone top-level route in `main.tsx`, not nested in the authenticated `Shell`, since it must
work with zero session) for real — backend #36's `POST /api/auth/verify-email` was a working
endpoint nobody had ever wired up; auto-verifies on mount, three states (verifying/verified/error),
deliberately the lighter centered treatment per the mockup since verification is informational-only.

**Found and fixed a real, separate bug while live-verifying this** (not planned scope, discovered
via the actual click-through): Spring Boot's own default error page for an unhandled 500 happens
to have `error`/`message` string fields too — the exact same shape as this app's own `ApiError`
record — so `api.ts`'s `isApiError` type guard was matching it as if it were a real structured
error, and a raw internal Hibernate exception message briefly rendered straight onto the Verify
Email page. Fixed by also requiring exactly two own keys (`Object.keys(body).length === 2`) —
Spring's default body always carries `timestamp`/`status`/`path` alongside `error`/`message`, a
genuine `ApiError` body never does. New regression test in `api.test.ts` using Spring's actual
default error shape. The backend bug that surfaced this (a real race in `verifyEmail` — two
near-simultaneous requests for the same token, the second gets an unhandled
`ObjectOptimisticLockingFailureException` instead of the normal 401) was filed separately as
backend issue #115, not fixed here (backend code, and the backend session was concurrently
mid-work on something else).

Verified live via Playwright/screenshots: Login (with its dot-grid/rings/value-props), Forgot
Password, and Reset Password all render the new split shell correctly; Verify Email's full round
trip (register → read the real token from Postgres, same technique as #55's password-reset
verification → visit the real link → success screen → reusing the same token shows the backend's
real "invalid or expired" message → a missing token shows the right message) — plus re-confirmed
after the `isApiError` fix that the race-condition 500 now shows the honest generic fallback
message instead of the leaked exception text.

**Step 6, #73 (Notifications status page), is done — this completes the Harbour Ledger redesign
in full, nothing deferred anymore.** Backend #114 shipped (`GET /api/notifications/status`,
returning `{channel: "logging"}` or `{channel: "email", fromAddress: "..."}`) — noticed it had
closed while starting this session's work, checked the actual response contract directly against
`NotificationStatusController`/`NotificationStatusResponse` before writing any frontend code
against it, rather than assuming the shape from the original request comment. `/notifications`
shows the active channel + from-address (if email) with an "Active" badge, plus a note that this
is app-level server config, not per-account — deliberately no "recently sent" history table, since
no backend endpoint exists for that and building one was never requested (a bigger feature needing
a persisted send log). Reachable from a new nav-rail "Notifications" item under the existing
"Account" caption group, matching the mockup's grouping. Verified live against the real backend:
confirmed the actual currently-active channel ("Logging (development)," this app's zero-config
default) renders correctly with the real explanatory copy, not placeholder text.

Also noticed while starting this that the backend session had independently fixed the token-
verification race condition filed as backend issue #115 (found live during #69's work) — no
action needed on this side, just confirmed it's resolved.

Closed #56 (email verification UI) retroactively — #69 already delivered it under a different
issue number, keeping the tracker honest rather than leaving a stale duplicate open.

**#71 (mobile nav — hamburger + off-canvas drawer) is done**, filling a real gap noticed while
double-checking #39's original checklist against what actually shipped: the redesign's nav rail
(#61) had zero responsive handling at all, a fixed 220px sidebar on every viewport width. `Shell.tsx`
now renders a `lg:hidden` topbar (hamburger + brand) and a backdrop below the `lg` breakpoint;
`NavRail` gained a `className` prop so `Shell` can reposition the exact same component (fixed
off-canvas + `-translate-x-full`/`translate-x-0` toggle below `lg`, normal in-flow grid column at
`lg`+) rather than maintaining two implementations. Closes automatically on navigation (a
`useEffect` keyed on `pathname`) or a backdrop tap. Verified live via Playwright at a real mobile
viewport width (390×844): confirmed the rail is genuinely off-screen via its actual bounding box
(not `isVisible()`, which doesn't account for CSS transforms — a real gotcha hit while writing
the check), slides on-screen when the hamburger is tapped, closes on backdrop tap, and closes
automatically after navigating to Calendar — plus confirmed the desktop layout (1280px) is
completely unaffected by any of this. New `Shell.test.tsx` covers the same open/close/close-on-
navigate logic at the unit level.

**#75 (register/login flow update for backend #120's enforced email verification) is done** — a
real breaking change, discovered live-broken rather than found through a routine check: the
backend expanded #36/#37's "informational only" email verification into an actually-enforced
requirement, and nothing on this side had caught up, so registration and login no longer worked
together at all. `api.ts`'s `register` now returns `RegistrationResponse` (`{message}`), not
`AuthResponse` — it never returns usable tokens anymore, matching the backend's own change (an
unverified account can't log in, so auto-logging one in was already a dead end). `LoginForm`
shows a "Check your email" screen on successful registration instead of navigating into the
dashboard, with a "Resend verification email" button (`api.resendVerification`, added even though
the issue itself flagged it as optional — without it, a lost verification email leaves a new
account permanently stuck, since the account already exists and re-registering just hits a 409).
`login`'s existing `ApiRequestError` handling already surfaced the backend's real 403 message
("Please verify your email before logging in.") with zero code changes needed — the #52 sweep's
investment paid off unprompted here.

**Found and fixed a second, genuinely separate bug purely from the live click-through, not
planned scope:** `VerifyEmailPage`'s effect had no guard against React StrictMode's dev-only
double-invoke, and unlike an idempotent data fetch, `verifyEmail()` consumes a single-use token -
the first of the two StrictMode-fired calls succeeds, the second (now correctly rejected by
backend #115's fix, no longer a 500) can resolve *after* the first and overwrite a true success
with a false "couldn't verify" error. The standard "ignore a stale response" cleanup pattern
doesn't fix this specific case (both calls are genuine, with different real outcomes) - fixed
with a `useRef` guard that survives the synthetic remount, preventing the second call from firing
at all. See NOTES.md §4x for the full reasoning on why the usual fix doesn't apply here.

Verified live end-to-end against the real backend: register → shown "Check your email," not the
dashboard → attempt to log in before verifying → real 403 message shown → read the actual
verification token from Postgres → verify for real → log in again → succeeds, lands in the
dashboard. Zero console errors.

**#30 (committed E2E test suite in CI) is done.** Every "live verification" this session (and every
prior one) was an ad-hoc Playwright script in the session scratchpad — real, valuable, but none
of it preserved as an actual regression check. Discussed the real architecture decision with the
user first rather than assuming: a true end-to-end suite would need CI to check out the *backend*
repo, build it with Maven, and spin up Postgres/LocalStack service containers — a much heavier,
cross-repo job. Chose (with the user) the lighter, self-contained alternative instead: Playwright
drives the real built frontend (`npm run build` + `vite preview`) in a real browser, but every
`**/api/**` call is intercepted and mocked at the network layer (`e2e/mocks.ts`) rather than
hitting a live backend — catches frontend regressions (rendering, routing, client-side logic),
not real backend-integration bugs (that class of bug — the CORS gap, the `isApiError` leak — is
exactly what this project's existing per-PR manual live-verification convention already exists to
catch, and still does; this suite doesn't replace that). Nine tests across three spec files:
`auth.spec.ts` (register shows check-your-email not the dashboard, login failure/403/success
message handling), `navigation.spec.ts` (every nav-rail link reaches its page, 404 fallback, the
Overview/Edit-business disabled→enabled transition), `businesses.spec.ts` (adding a business shows
up without a refetch, client-side search filtering). Added as a **separate** `e2e` CI job, not
folded into the required `build-and-typecheck` check, so a flaky/slow E2E run can't block merging
on its own — branch protection itself wasn't changed. `vite.config.ts`'s Vitest config now
excludes `e2e/**` so the two suites (Vitest's own `*.test.tsx` component tests vs. Playwright's
`*.spec.ts` browser tests) never try to run each other's files.

**#77 (custom obligation CRUD UI, the frontend counterpart to backend #59) is done** — the backend
API had been fully usable for weeks with nothing exposing it. `CustomObligationsPanel`, added to
`BusinessDetailPage` alongside `DeadlinesPanel`/`WorkPassesPanel`, follows `WorkPassesPanel`'s
established pattern (add dialog, table, delete-confirmation dialog) plus a new edit dialog, since
a custom obligation's fields are meant to be corrected in place, not just removed and re-added.
Recurrence is a "Repeats" checkbox that reveals a "every N months" number input when checked,
converting to the backend's nullable `recurrenceMonths` only at submit time. `Deadline` gained
optional `customName`/`customObligationId` (mirroring the backend's own shape) — `DeadlinesPanel`
and `CalendarPage` both used to index `OBLIGATION_LABELS[obligationType]` directly, which has no
entry for `CUSTOM`; fixed with a new `deadlineLabel()` helper in `urgency.ts`, and
`OBLIGATION_LABELS` itself is now typed to exclude `"CUSTOM"` so a future direct-index attempt is
a compile error, not a silent `undefined`. Found a second jsdom gap in the same family as the
Radix `Select`/pointer-capture one (#18, see gotchas below) — Radix `Checkbox`'s own
`react-use-size` hook calls `ResizeObserver`, which jsdom doesn't implement either; fixed the same
way, a no-op polyfill in `src/test/setup.ts`. New `CustomObligationsPanel.test.tsx` (8 cases).
Verified live via a scratch Playwright script against the real running backend (not mocked):
registered, verified via a real DB-read token, logged in, created a business, added both a
one-off and a recurring (every-3-months) custom obligation, confirmed both actually appear in
`DeadlinesPanel` under their own real names, edited one, and confirmed the remove-confirmation
dialog's Cancel/"Yes, remove" both behave correctly — zero console errors throughout.

**#26 (accessibility pass) is done.** Read the codebase first rather than assuming what needed
fixing — icon-only buttons already all had `aria-label`s, lucide-react already auto-applies
`aria-hidden="true"` to purely decorative icons, and shadcn's `button.tsx`/`badge.tsx` already
ship `focus-visible` ring styling everywhere. Three real, concrete gaps found instead: (1) the
Calendar page's month-grid day-dots were a genuine color-only violation — no text/shape difference
at all, unlike every urgency *badge* elsewhere (which already had text) — fixed with
shape-differentiated dots (`DOT_SHAPE_CLASSES`: filled circle / rotated square / hollow ring) plus
a real `aria-label` per day cell summarizing its deadlines in words; (2) urgency badges gained a
per-tier icon on top of their existing text (`AlertTriangle`/`Clock`/`CalendarCheck`), extracted
into a shared `UrgencyBadge` component now used by all four places that used to build the same
badge inline (`DeadlinesPanel`, `WorkPassesPanel`, `CustomObligationsPanel`, `CalendarPage`); (3) a
real ARIA-announcement gap across all 11 form-error `<p>` sites app-wide — none had `role="alert"`,
so a screen reader user only found out about a validation error by manually navigating to it —
fixed via a shared `FormError` component (`role="alert"`). Keyboard-nav review was mostly a
verification pass (every control is already a real button/link/input, Radix handles Dialog/Select/
Checkbox focus internally) — confirmed live via keyboard-only Playwright that Tab/Enter completes
registration end to end with a real visible focus indicator throughout, nothing needed fixing
there. New `UrgencyBadge.test.tsx`/`FormError.test.tsx`, plus `deadlineLabel` cases added to
`urgency.test.ts`. Verified live via Playwright against the real backend: the keyboard-only flow,
and a second script confirming the calendar day-cell `aria-label`/shape markup actually renders.

**#81 (resend-verification was a dead end outside the registration screen) is done** — found live
while checking on stuck unverified accounts: the "Resend verification email" button only ever
existed on the post-registration "check your email" screen; closing that screen (or coming back
to log in later, having lost the original email) left a real 403 message with no recovery path,
since re-registering the same email just 409s. Fixed by showing the same resend button directly on
the login form whenever a login attempt fails with the `FORBIDDEN` code specifically (not the
plain wrong-credentials `UNAUTHORIZED` case) — cleared on switching modes or editing the email so
a stale offer doesn't linger. New `LoginForm.test.tsx` cases (resend appears and works for a 403,
does not appear for a 401), verified live end to end against the real backend: registered,
deliberately never verified, hit the real 403 on a later login attempt, used the new resend
button, verified with the fresh token, and confirmed login then genuinely succeeds.

**#34 (browser push notifications, an interim reminder channel) is done.** Discussed scope with
the user first — the issue's own "needing nothing but the user's browser permission" phrasing
matches the plain Web Notification API (fires only while the app tab is open, no backend changes)
rather than the full Push API (works even with the browser closed, but needs a service worker,
VAPID keys, and a new backend endpoint — a much bigger feature than asked for) — and where
permission gets requested (an explicit toggle on the Notifications page, not an auto-prompt most
browsers already discourage). New `browserNotifications.ts` (permission/preference wrapper +
localStorage dedup, keyed the same composite way backend #59's own dedupe already is), a shared
`useAllDeadlines` hook extracted from `CalendarPage`'s own inline fetch-and-merge logic, and
`BrowserNotificationWatcher` (mounted once in `Shell`, checks every 15 minutes against each
business's own `leadTimeDays` — the same threshold the backend's own reminder pipeline already
uses, not a separately hardcoded number). Found and fixed a real gap in the committed E2E suite
while verifying live — the watcher now fetches deadlines globally, not just on Calendar, which
needed a new mock added to a business-list test that hadn't needed one before. Verified live
against the real backend: granted real browser permission via Playwright, created a business with
a deadline due today, confirmed a real `Notification` fires with the right title/body, navigated
elsewhere to prove it isn't page-scoped, then reloaded and confirmed the same deadline doesn't
notify twice (dedup surviving a real reload, not just a React re-render).

**`src/components/` was reorganized by feature** (`auth/`, `business/`, `calendar/`,
`notifications/`, `account/`, `shell/`, plus `FormError.tsx`/`UrgencyBadge.tsx` staying at the
top level as genuinely cross-feature) — mirrors the backend's own package-by-feature restructure
(backend issue #90), requested directly, confirmed the grouping scheme with the user first
(feature/domain over by-component-type). A mechanical move in the end since every cross-component
import already used the `@/components/...` alias — see the gotcha above.

**#20 (dark mode toggle) is done.** The dark palette existed since #59 with no way to switch into
it — new `src/lib/theme.ts` around the repo's existing `.dark`-class convention, a Light/Dark
segmented toggle on the Account page matching `LoginForm`'s own Log in/Sign up pill pattern, and a
small inline script in `index.html` (ahead of any module loading) so a returning user with dark
mode chosen never sees a flash of the light theme first — deliberately duplicated, not imported,
from `theme.ts`'s own logic, since it has to run synchronously before any ES module exists.
Verified live: the real computed background color actually changes, the choice survives a real
page reload, and it applies app-wide, not just on the Account page.

**#25 (custom favicon and page title) is done.** Replaced the default Vite/shadcn-init placeholder
favicon with a shield-check glyph on a brass-gold square — the same `ShieldCheck` icon already
used as the brand mark in `NavRail`/`AuthShell`, path data copied straight from lucide-react's own
source so it's pixel-identical, not just similar. `<title>` changed from the literal "frontend" to
"Compliance Tracker" (static, app-wide — not per-route dynamic titles, out of this issue's smaller
"minor branding polish" scope). Verified visually via a Playwright screenshot, not just that the
file changed.

**#29 (loading skeletons) is done.** Swept beyond the issue's own literal wording — `grep`ed for
every existing plain `"Loading..."` spot (7 found), then checked `BusinessesPage`/`BusinessList`
directly and found an eighth, worse gap: no loading indicator at all, not even text. New shared
`Skeleton` primitive (via the shadcn CLI, not hand-written), `TableRowsSkeleton`
(`columns`/`rows`) for every panel showing a `Table` mid-fetch, `PageSkeleton` (`cards`) for
`BusinessDetailPage`/`EditBusinessPage`'s outer "page hasn't loaded yet" state, and
`StatCardSkeleton` alongside `StatCard` itself. `CalendarPage`'s timeline and
`NotificationsPage`'s status card each got bespoke one-off skeleton markup instead, since neither
shape is shared with anything else. New `TableRowsSkeleton.test.tsx` plus two new
`WorkPassesPanel.test.tsx` cases (never-resolving promise proves the skeleton shows with real
headers already visible; a resolving one proves it's fully gone once real rows render) —
representative of the same pattern the other three `TableRowsSkeleton` callers share. Verified
live via two scratch Playwright scripts against the real backend with every network call
artificially delayed 800ms (otherwise too fast to ever observe locally) — confirmed real skeleton
placeholders render and closely match the eventual layout (via screenshots) on Businesses, the
business detail page, Calendar, and Notifications, and that the skeleton count drops to zero once
each fetch resolves.

**#27 (CSV export of businesses/deadlines) is done.** No library dependency — `src/lib/csv.ts`
(`toCsv`/`downloadCsv`, real RFC 4180 escaping, no dependency needed for something this small).
Shipped both options the issue named, not just one, since they share the same underlying
functions: `BusinessList` exports whatever's currently filtered/sorted (not the full unfiltered
list), `DeadlinesPanel` exports one business's own deadlines with a filename identifying which
business it's for. New `csv.test.ts` (escaping rules + the real download DOM mechanics) and new
`DeadlinesPanel.test.tsx` (didn't exist before). Verified live via Playwright against the real
backend using `page.waitForEvent("download")` — read both actual downloaded files' disk content
afterward and confirmed the real rows/headers/filenames, not just that a download fired. Along
the way, found the local Docker containers had silently exited ~18 hours earlier (machine
sleep, not this session) — restarted them, confirmed the backend's connection pool reconnected
on its own, and recreated the LocalStack SQS queues (their state doesn't survive a restart, an
already-known gotcha).

**#22 (toast/success feedback system) is done.** Only errors got real feedback before this (a red
`FormError` box) — a successful action just relied on the UI visibly changing as its only
confirmation. New `src/components/ui/sonner.tsx`, adapted by hand from shadcn's own `sonner`
registry entry to read this app's own `theme.ts` instead of the `next-themes` package that entry
assumes (a Next.js-only dependency this plain Vite SPA has no use for) — mounted once in
`main.tsx`, above the router, so a toast fired from any page has somewhere to render. Swept every
action that previously had zero success feedback: login, logout, and create/update/delete for
businesses, work passes, and custom obligations. Deliberately *not* added to password reset/
forgot-password/resend-verification, which already show their own persistent inline success
message — a toast on top would just be noise. Found and fixed a small state-capture gotcha in the
two optimistic-delete panels (`WorkPassesPanel`/`CustomObligationsPanel`): the removed row is
already gone from state by the time a toast needs to say whose item it was, fixed by capturing the
item itself before the optimistic filter runs. Verified live via Playwright against the real
backend: registered, verified, logged in, created/edited/deleted a business, added/removed a work
pass, and logged out — a real toast with the right text shown for every single one, zero console
errors.

**#36 (print-friendly deadlines view) is done.** No print stylesheet existed before this — printing
any page as-is would have printed the dark nav rail, the ambient background, every action button,
and whatever the active theme happened to be. Tailwind's `print:` variant on existing markup
(`Shell.tsx` hides the nav rail/topbar/ambient background, `sonner.tsx`'s `Toaster` too — found
live via a Playwright screenshot that a lingering toast otherwise floats over the printed page),
plus one small `@media print` block in `index.css` forcing plain black-on-white regardless of the
active theme, since a printout isn't a themed surface. New `src/components/PrintHeader.tsx`
(hidden on screen, shown only in print output — title, print date, and the "not compliance advice"
disclaimer that would otherwise only ever appear on the login page) used by `DeadlinesPanel` and
`CalendarPage`. Scoped tightly to what the issue actually asks for: `BusinessDetailPage` hides
`WorkPassesPanel`/`CustomObligationsPanel` on print (only the deadlines list is a printable
document — decided at the page-composition level, not baked into either panel), and Calendar's
month-grid card (colored dots don't reproduce on paper) is print-hidden too, leaving only the
"Upcoming, all businesses" list, expanded to full width. A "Print" button (`window.print()`) in
each panel's header, matching the existing "Export CSV" button's placement. Verified live via
Playwright: `emulateMedia({ media: "print" })` plus full-page screenshots of both print views,
confirmed via actual screenshot inspection that chrome/toasts are genuinely gone and the
disclaimer is genuinely present.

**#28 (bulk CSV import of businesses) is done.** Only one-at-a-time creation existed before this —
the issue's own example (an accounting firm's client list) doesn't scale to typing each one in by
hand. No new backend endpoint — each valid row from the file goes through the existing
single-business `POST /api/businesses`, sequentially, same as typing it into `AddBusinessDialog` N
times. New `parseCsv` in `src/lib/csv.ts` (a real RFC 4180 parser, not `line.split(",")`, which
would break on exactly the fields `toCsv` already knows to quote) and `ImportBusinessesDialog`
(header-matched columns so `BusinessList`'s own CSV export round-trips straight back in; a
row that fails to parse is flagged per-row in a preview table rather than blocking the rest of the
file; a row that fails the real backend's ACRA first-year validation shows that exact message
inline, same `ApiRequestError` handling every other form uses). Reuses issue #22's toast system
for the overall import summary. Verified live via Playwright against the real backend: a
comma-containing quoted name, an invalid date rejected client-side, and a row that genuinely
violates the real ACRA rule all handled correctly, successfully imported businesses appeared in
the list with zero refetch.

**#35 (bulk select + bulk actions on the business list) is done.** Every action before this worked
one business at a time. Selection is a `Set<number>` of ids (survives a search/sort/filter
re-render); select-all only touches currently-visible (filtered) rows, with a genuine three-way
header checkbox state (all/some/none) via Radix's `checked="indeterminate"`. A bulk action bar
("N selected", "Export selected", "Delete selected") appears only once something's selected. Bulk
delete reuses two already-established patterns rather than inventing new ones: sequential API
calls (same reasoning as `ImportBusinessesDialog`'s bulk create, #28) and a Cancel/"Yes, delete N"
confirmation dialog matching `DeleteBusinessDialog`'s own shape; a partial failure shows the real
per-item backend error via a toast (#22) alongside a partial-success summary. Found and ruled out
a false alarm during live verification, not a real bug: a `psql` check appeared to show a
non-selected business deleted too, which turned out to be querying an AES-GCM-encrypted column
(`business.name`, issue #63) with a plaintext `LIKE` that could never match anything regardless of
whether the row existed — the real proof came from intercepting the actual network requests, which
showed exactly the two selected ids' `DELETE` calls and nothing else. Verified live via Playwright:
created three businesses, selected two, exported just those two, confirmed Cancel doesn't delete,
confirmed the real delete removes exactly the two selected and leaves the third, zero console
errors.

**Frontend#95 (severe layout regression — the whole authenticated app's grid broken at desktop
widths) is fixed.** Reported directly by the user via a screenshot, not found through the normal
backlog: `Shell.tsx`'s nav-rail/main-content grid (`lg:grid-cols-[220px_1fr]`) got a stray extra
grid item when #36 (print-friendly view, this same session) wrapped `AmbientBackground` in a new
`<div className="print:hidden">` — that wrapper isn't itself `fixed` (only `AmbientBackground`'s
own root is) and has no `lg:hidden`, so at desktop widths it silently became a real first grid
item, shifting the nav rail and main content each into the wrong column — confirmed via
`getComputedStyle` showing their widths exactly swapped. The committed E2E suite never caught it,
since none of its assertions check actual layout/widths, only element presence. Fixed by giving
`AmbientBackground` its own `className` prop and passing `print:hidden` directly onto its
already-`fixed` root instead of wrapping it — see NOTES.md §4am and gotchas above. Verified live
via Playwright: computed styles before/after, a full-page screenshot at the same viewport the
original bug report used, and a re-check that print media still correctly hides both the ambient
background and nav rail (the original #36 feature untouched).

Open (not started): #7 (deploy — depends on backend #5). No open medium/high-urgency issues
remain on either repo as of this session.

See `README.md` and GitHub issues for full detail; don't duplicate that detail here.
