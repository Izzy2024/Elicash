# EliCash Copilot Instructions

## Project shape

- **Frontend**: Astro 6 + React 18 islands + Tailwind CSS v4 + TypeScript.
- **Backend**: Express 5 + TypeScript + Prisma v7 using `@prisma/adapter-pg` + PostgreSQL.
- **Product focus**: loan management for small businesses, with fast access to clients, loans, collections, delinquency, reports, PDFs, and offline-first UI.

## Build and run

### Frontend

```bash
cd frontend && npm run dev
cd frontend && npm run build
cd frontend && npm run preview
```

### Backend

```bash
cd backend && npm run dev
cd backend && npm run build
cd backend && npm run start
cd backend && npx prisma generate
cd backend && npx prisma migrate dev
cd backend && npx tsx prisma/seed.ts
```

### Tests and linting

- There is **no test script** in either `frontend/package.json` or `backend/package.json` yet.
- There is **no lint script** defined in either package yet.
- If tests are added later, prefer running a single file or name filter from the package root.

## Architecture

- The frontend is a mix of **Astro pages/layouts** and **React islands**. Most interactive screens live in `frontend/src/components`, then get mounted from `.astro` pages with `client:load`.
- `frontend/src/layouts/MainLayout.astro` is the authenticated shell: it bootstraps `/api/auth/me`, redirects unauthenticated users to `/login`, registers the service worker, and renders the bottom nav used across the app.
- Authentication state is cached in `zustand` (`frontend/src/hooks/useAuthStore.ts`) and mirrored to `localStorage` as `elicash_user`.
- Network calls should go through `frontend/src/lib/api.service.ts` unless a request needs special handling like file download. That service always sends cookies and handles `401` by clearing the cache and redirecting to `/login`.
- The backend is organized by **routes → controllers → services**, with shared Prisma access in `backend/src/lib/prisma.ts`.
- `backend/src/app.ts` wires the Express app, CORS, cookies, JSON parsing, and route registration. `backend/src/index.ts` connects Prisma, starts the server, and initializes alert scheduling.
- Prisma schema lives in `backend/prisma/schema.prisma`; models use UUID primary keys and relations for tenants, users, clients, routes, loans, installments, payments, and configs.

## Conventions

- Use `MainLayout` for authenticated pages; auth pages like `/login` and `/register` should not require the guard.
- Keep React islands small and stateful; put page data fetching inside the island, not in Astro when the UI is interactive.
- Use the existing auth flow: `POST /api/auth/login`, cookie-based JWT, then `GET /api/auth/me` to hydrate user state.
- Backend routes under `/api/*` generally use `authMiddleware`; `/api/auth/*` is the exception.
- Return API errors as `{ message: string }`; auth responses include user + tenant currency/symbol data.
- Tailwind custom utilities already exist in `frontend/src/styles/global.css`: `tabular-nums`, `press-96`, and `subtle-surface`. Reuse them instead of inventing new one-off styles.
- Monetary values should stay visually precise: right-align them where practical and use tabular numerals.
- The design system is intentionally direct and professional. Prefer clean surfaces, strong hierarchy, and semantic color use: blue for brand/actions, emerald for success, red/orange for risk and critical states.
- UI docs in `docs/superpowers/specs` and `docs/superpowers/plans` capture accepted patterns for login, clients, morosos, and account statements; follow them when extending those areas.

