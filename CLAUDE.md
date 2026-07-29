# Compliance Tracker — Frontend

See `../CLAUDE.md` for overall project purpose and how I want to collaborate — this file only
covers frontend-specific details. I'm new to this stack entirely (no prior React/frontend
experience) — explain framework concepts, not just Java/Spring ones.

## Tech stack (decided, don't change without discussing)

- **Framework:** React 19 + TypeScript
- **Build tool:** Vite
- **Styling:** Tailwind CSS v4 (uses the `@tailwindcss/vite` plugin, not the older PostCSS config style)
- **Components:** shadcn/ui — components are copied into `src/components/ui/` via its CLI, not an npm dependency; edit them freely, they're owned code
- No routing library, no state management library — the app is small enough that `useState`/`useEffect` is enough; revisit if it grows
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

Open (not started): #7 (deploy — depends on backend #5).

See `README.md` and GitHub issues for full detail; don't duplicate that detail here.
