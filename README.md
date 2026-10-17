# Enterprise Core App (React + Vite + TypeScript template)

A reusable, type-safe frontend core: generic services, data table, forms, guards,
real-time hub and router state memory. Concrete features are added on top
without touching the generic layer. The full specification and rules for AI
agents are in [`agents.md`](./agents.md).

## Stack
React 19 · Vite 8 · TypeScript 6 · TanStack Router / Query / Table · Zustand ·
React Hook Form + Zod 4 · Axios · SignalR · Tailwind CSS 4 · shadcn/ui primitives ·
ESLint 10 (flat config) · Vitest

## Quick start
```bash
copy .env.example .env.development   # PowerShell/cmd (cp on macOS/Linux); edit the API URL
npm install          # resolves the latest versions ("latest" ranges)
npm run deps:pin     # one-time: freeze them as ^x.y.z in package.json
npm run dev
```
For other environments create `.env.production` / `.env.<mode>.local` from `.env.example`.
A missing or invalid variable stops `dev` and `build` immediately with a list of problems.

## One-command setup
```powershell
npm run setup      # env files, npm ci, MSW worker, Playwright browser, verify, e2e
```
See `setup.ps1` (`-SkipE2E`, `-SkipVerify`).

## Mock backend (no server needed)
```bash
npm install -D msw
npx msw init public --save
```
Then add `VITE_ENABLE_MOCKS=true` to `.env.development` and run `npm run dev`.
Demo users: `admin/admin` (everything), `manager/manager` (read + write), `viewer/viewer` (read only).
Access tokens expire after 60 seconds, so the silent refresh is exercised while you click around.
The mock is never included in production builds.

## Real backend (.NET 10 + SQL Server)
The reference API lives in `enterprise-core-app-claude-server` (see its `README.md`):
```powershell
cd ..\enterprise-core-app-claude-server
dotnet run --launch-profile http     # http://localhost:7077, seeds admin/manager/viewer in Development
```
Then create `.env.development.local` here with:
```
VITE_API_BASE_URL=http://localhost:7077/api
VITE_ENABLE_MOCKS=false
```
and restart `npm run dev`. Delete the file (or set `VITE_ENABLE_MOCKS=true`) to go back to the mock.

## Scripts
| Script | What it does |
|--------|--------------|
| `npm run dev` | Dev server (generates `src/routeTree.gen.ts` on the fly) |
| `npm run build` | Generate routes → type-check → production build |
| `npm run typecheck` | `tsr generate && tsc -b` |
| `npm run typecheck:fast` | Same with the native `tsgo` compiler (preview) |
| `npm run lint` | ESLint 10, type-aware rules |
| `npm run test` | Vitest unit tests |
| `npm run verify` | typecheck + lint + unit tests + build |
| `npm run test:e2e` | Playwright end-to-end suite (own dev server on :5174 with mocks) |
| `npm run test:e2e:ui` | Interactive Playwright runner |
| `npm run verify:all` | `verify` + `test:e2e`: the definition of done |
| `npm run deps:latest` | Upgrade everything except TypeScript (see agents.md) |

## Layout at a glance
```
src/lib         runtime engines (env, apiClient, router, query client, casing, tenancy)
src/services    BaseApiService<T>, GenericHubService<T>, StorageService, entityQueries
src/components  shared/ generic components · ui/ shadcn primitives
src/hooks       entity mutations, hub connection, table ↔ URL binding
src/features    auth (done) · your features (Step 3)
src/routes      file-based routes (_authenticated = protected layout)
```

## Troubleshooting
- **`ERESOLVE` peer conflict on install**: a plugin has not yet declared support for a
  new major (ESLint 10 or TypeScript is the usual cause). Check the compatibility map
  in `agents.md`; as a temporary measure, `npm install --legacy-peer-deps`.
- **`Cannot find module '@/routeTree.gen'`**: run `npm run typecheck` or `npm run dev` once;
  the file is generated.
- **Login works but a reload logs you out**: the refresh cookie is not being sent. The API
  needs CORS `AllowCredentials` with an explicit origin, and the cookie needs `SameSite`/`Secure`
  settings that match your hosts.
