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

## Current environment

- Node v22, npm v10
- Project lives at `~/Documents/Projects/compliance-tracker/frontend`
- Needs the backend running on `http://localhost:8081` (with its own Docker deps up) to do anything real — this app has no data of its own

## Known gotchas already hit

- **CORS**: the backend blocks browser requests from a different origin by default — needed an explicit `CorsConfig` on the backend side (backend issue #15/PR #16) before this frontend could talk to it at all. curl/Postman were never affected since CORS is a browser-enforced rule.
- **shadcn CLI is a different generation than older tutorials describe** — this version uses `-t vite -b radix -p nova` flags (template/base/preset), not the older simpler prompts. `npx shadcn@latest init --help` to see current options if this breaks again on an upgrade.
- **TypeScript's `baseUrl` compiler option is deprecated** in newer TS versions — use `paths` alone (no `baseUrl`) for the `@/*` import alias in `tsconfig.json`/`tsconfig.app.json`.
- **Jest/Vitest not set up yet** — there is currently zero test coverage on this project (see issue #9). Don't assume test infra exists.

## Project status

Issues #1 (scaffold), #2 (business list + add form), #5 (CI workflow) are closed and merged. **#3 (deadlines view for a selected business) is the current in-progress item** — the `DeadlinesPanel` component already exists as local WIP but isn't wired into `App.tsx` or turned into its own PR yet.

Open: #3 (deadlines view), #7 (deploy — depends on backend #5), #8 (login/auth UI — depends on backend #19), #9 (test suite — currently zero tests).

See `README.md` and GitHub issues for full detail; don't duplicate that detail here.
