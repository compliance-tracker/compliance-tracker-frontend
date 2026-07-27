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
- **Auth:** JWT stored in `localStorage` (`src/lib/auth.ts`), attached to every request in `api.ts`'s `request()` helper — no auth context/provider, just a plain module with get/set/clear functions

## Current environment

- Node v22, npm v10
- Project lives at `~/Documents/Projects/compliance-tracker/frontend`
- Needs the backend running on `http://localhost:8081` (with its own Docker deps up) to do anything real — this app has no data of its own

## Known gotchas already hit

- **CORS**: the backend blocks browser requests from a different origin by default — needed an explicit `CorsConfig` on the backend side (backend issue #15/PR #16) before this frontend could talk to it at all. curl/Postman were never affected since CORS is a browser-enforced rule.
- **shadcn CLI is a different generation than older tutorials describe** — this version uses `-t vite -b radix -p nova` flags (template/base/preset), not the older simpler prompts. `npx shadcn@latest init --help` to see current options if this breaks again on an upgrade.
- **TypeScript's `baseUrl` compiler option is deprecated** in newer TS versions — use `paths` alone (no `baseUrl`) for the `@/*` import alias in `tsconfig.json`/`tsconfig.app.json`.
- **Jest/Vitest not set up yet** — there is currently zero test coverage on this project (see issue #9). Don't assume test infra exists.
- **The backend now requires auth on every business endpoint** (backend #19) — a request with no/invalid token gets a 401. `api.ts`'s `request()` treats a 401 from `getBusinesses` specially in `App.tsx` (clears the stored token, bounces back to the login screen) rather than showing a generic "can't reach backend" error, since those are two different problems.
- **`request<T>()` unconditionally called `response.json()`** — worked fine until the work pass DELETE endpoint (`204 No Content`, empty body) came along, which threw a `SyntaxError` parsing nothing. First fix short-circuited on `response.status === 204` specifically; when logout (issue #41) came along returning `200` with an *also*-empty body, that status-code special-casing didn't cover it. Generalized instead: read the response as `text()` first, only `JSON.parse` if non-empty — covers any current or future no-body response regardless of status code, not just the ones anticipated one at a time.
- **A saved HTML design mockup (separate artifact, not in this repo) explored a richer visual language than a few real components had** — restyled the existing ones to match (uppercase table headers, a urgency badge on work passes, a segmented login toggle), but deliberately skipped anything the mockup showed with no real data/backend behind it (a "Pass type" column with no matching field, whole new pages like Admin rules/Account/Notifications/404 — tracked separately as frontend issue #39). If asked to "match the design" again, check whether what's being asked for actually has real data behind it before adding it.
- **A sibling component's `useEffect` won't refetch just because *related* data changed elsewhere** — `DeadlinesPanel`'s effect only depends on `business`, so adding/removing a work pass in the separate `WorkPassesPanel` never triggered a refetch (found via user testing, not by me — my own Playwright check only looked at `WorkPassesPanel`'s own table, not whether `DeadlinesPanel` picked up the new deadline). Fixed with a `refreshKey` counter lifted to `App.tsx`, bumped via an `onWorkPassesChanged` callback. General lesson: when two components both derive from the same backend state but fetch independently, changing one's data doesn't automatically refresh the other — check for this explicitly whenever a mutation in one panel should be reflected in a sibling.
- **Visual polish alone didn't fix "feels empty"** — a color accent + shadows pass still read as sparse; the actual fix was structural (stat tiles, wider container, side-by-side grid instead of a stacked single column). Layout/information-density matters more than color for "does this look like a real product."
- **Labels**: added `area:ui`/`area:auth`/`area:infra`/`area:testing` to this repo, matching the backend's `area:*` convention (previously every issue just had the generic `enhancement` label with no further categorization).

## Project status

Issues #1 (scaffold), #2 (business list + add form), #3 (deadlines view), #5 (CI workflow), #8 (login/register UI), #13 (visual polish/dashboard layout) are all closed and merged (PR #12). Backend PR #23 (auth) is merged too — both `main`s now work together end to end: register, add a business, see real deadlines.

The login page went through three passes before it stopped feeling "empty"/generic: (1) a bare centered card → (2) split layout with a branding/value-prop panel → (3) that panel's flat solid-color fill became a gradient with decorative blurred shapes plus `justify-between` spacing so content fills the full height. Worth remembering that a single "add some color" pass often isn't enough — layout/spacing and depth matter as much as color choice.

Repo GitHub org/URLs were stale in this file and README.md for a while after the `Chrainx` → `compliance-tracker` org transfer — fixed, but worth double-checking any hardcoded repo URLs if this happens again.

#15 (work pass management UI — `WorkPassesPanel.tsx`, depends on backend #24) is done, verified live via Playwright (add/list/delete a work pass, no console errors).

A fourth login-page pass added a segmented "Log in"/"Sign up" pill toggle (replacing a plain text link) plus uppercase table headers and a work-pass renewal urgency badge, matching a saved design mockup — see NOTES.md §4c. Frontend issue #39 tracks the remaining mockup pages that don't have real functionality behind them yet (Admin rules, Account, Notifications status, Businesses list, 404) — not built.

`handleLogout` now calls the real `POST /api/auth/logout` (backend issue #41) before clearing local state, best-effort (`try`/`catch`, always clears locally regardless of the server call's outcome). Verified live: watched the actual network request the button fires, confirmed the token it revokes genuinely stops working on the very next request — not just that a request went out.

Open (not started): #7 (deploy — depends on backend #5), #9 (test suite — currently zero tests).

See `README.md` and GitHub issues for full detail; don't duplicate that detail here.
