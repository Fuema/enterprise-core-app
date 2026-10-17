# AI Agent Specification: Type-Safe React Vite Extensible Template Core

## 🎯 Objective
Create a highly scalable, production-ready, and **100% type-safe frontend core template** using **React (Vite) and TypeScript** configured as an automated multi-step blueprint. The core principle of this project is strict architectural inversion: **All services, UI wrappers, forms, types, and data-flow pipelines must be built as abstract, highly reusable generics first (Step 2).** Only after explicit validation will a concrete domain feature, such as *Employee Administration*, be written by inheriting or extending these generic layers (Step 3).

### 📍 Current Status
| Step | Scope | Status |
|------|-------|--------|
| 1 | Environment, tooling, version matrix | ✅ Done |
| 2 | Generic core (types, services, router, components, forms, auth) | ✅ Validated 2026-10-17 (typecheck, lint, build, browser) |
| 2b | Dev mock backend (MSW) | ✅ Validated 2026-10-17 (login, permissions, session restore) |
| 3 | Concrete feature: Employees (reference implementation) | ✅ Validated 2026-10-17 (typecheck, lint, full browser checklist) |
| 4 | Automated acceptance: Playwright e2e (17 tests) + `setup.ps1` | ✅ 17/17 passing 2026-10-17 |
| 5 | Real backend (.NET 10 + SQL Server, `enterprise-core-app-claude-server`) + Employees on the real domain (DOB, gender, country/state/city cascade, address, pincode, bulk delete) | ✅ Owner-validated 2026-10-17 against the real SQL Server DB (`VITE_ENABLE_MOCKS=false`) |
| 6 | Signup, Countries / States / Cities CRUD with per-feature permissions, registry-driven navigation + dashboard; e2e 29 tests | ✅ Validated 2026-10-17: owner browser check against the real SQL Server DB (admin creates countries, manager reads countries, viewer only reads employees) + `npm run verify:all` (43 unit, e2e 29/29) |

| 7 | User administration: `/users` list + detail with permission matrix editor (users:read / users:write), deactivation, lock-out guards; e2e 36 tests | ✅ Validated 2026-10-17: `npm run verify:all` (48 unit, e2e 36/36) |

Next feature? Follow **🧭 Feature Development Procedure** below and log the work in **📝 Change Log**.

---

## 🛠️ Package Management & Version Matrix
The engineering agent must strictly enforce the following versioning and dependency validation protocols during environment setup:

1.  **Bleeding-Edge Versioning:** Always download and configure the **latest stable versions** of all referenced software packages. Do not anchor to hardcoded legacy versions.
    *   `package.json` ships with `"latest"` ranges. After the first `npm install`, run `npm run deps:pin` to convert them into caret ranges of the installed versions (reproducible builds; `package-lock.json` is committed).
    *   To move forward later: `npm run deps:latest` (npm-check-updates, excluding TypeScript; see below).
2.  **Explicit Compatibility Mapping (ESLint & React 19):** Modern package definitions (specifically ESLint 9+ Flat Config architectures and React 19 concurrent features) change traditional configuration syntax. The agent must thoroughly validate peer-dependency trees.
    *   **ESLint Configuration:** Do not use old `.eslintrc` JSON blocks. Enforce the modern, modular `eslint.config.js` Flat Config pattern.
    *   **Tailwind Integration:** Enforce the compilation standards of **Tailwind CSS v4** (using pure CSS directives over traditional configuration files).

### Compatibility Map (verified October 2026)
| Package | Line | Rule / Reason |
|---------|------|---------------|
| `typescript` | **6.x (pinned `^6`)** | TypeScript 7 (native Go compiler, GA Aug 2026) is **not** supported by `typescript-eslint` yet (peer range `<6.1`, programmatic API returns in 7.1). Keep 6.x for `tsc`/lint; `@typescript/native-preview` provides `tsgo` for the optional `npm run typecheck:fast`. Revisit when typescript-eslint supports 7.x. |
| `eslint` | 10.x | Flat config only (`.eslintrc` support removed). Node `^20.19 \|\| ^22.13 \|\| >=24`. |
| `eslint-plugin-react` | **not used** | Did not declare ESLint 10 peer support at release; React rules come from `eslint-plugin-react-hooks` (`configs.flat.recommended`, includes React Compiler rules) + `eslint-plugin-react-refresh`. |
| `vite` | 8.x | Rolldown/Oxc based. |
| `@vitejs/plugin-react` | 6.x | Babel removed. To enable React Compiler use `@rolldown/plugin-babel` + `reactCompilerPreset()` **before** `react()`; never `react({ babel })`. |
| `tailwindcss` / `@tailwindcss/vite` | 4.x | Config lives in `src/index.css` (`@import 'tailwindcss'`, `@theme`). No `tailwind.config.js`, no PostCSS config. |
| `zod` | 4.x | Uses `z.url()`, `z.stringbool()`, `z.prettifyError()`. |
| `@hookform/resolvers` | 5.x | Zod 4 support; `zodResolver(schema)` infers input/output types. |
| `@tanstack/react-router` | 1.x | File-based routing via `@tanstack/router-plugin/vite` (`tanstackRouter()` must precede `react()`); `tsr generate` (router-cli) for CI type-checks. |
| `@tanstack/react-table` | **9.x** | `useTable` (not `useReactTable`) with an explicit, module-level `tableFeatures({...})` set (see `lib/dataTable.ts`); no `getCoreRowModel()`; core types take `TFeatures` first (`ColumnDef<TFeatures, TData, TValue>`); render with `<table.FlexRender cell/header />`. `data`/`columns` must be stable references. Version-specific guides ship in `node_modules/@tanstack/react-table/skills/`. |
| `msw` | **3.x** (dev only) | `setupWorker` from `msw/browser`; unhandled traffic option is `onUnhandledFrame` (v2's `onUnhandledRequest` was removed). `public/mockServiceWorker.js` is generated by `npx msw init public --save`; regenerate it after upgrading MSW. |
| `@playwright/test` | 1.64.x (dev only) | Chromium only (`npx playwright install chromium`). Do not write Playwright fixtures with a parameter named `use` in `e2e/`: the React Hooks lint rule treats it as React's `use()`; prefer plain helper functions (`e2e/helpers.ts`). |
| `radix-ui` | unified package | shadcn/ui "new-york" primitives import `{ Slot, Label } from 'radix-ui'`. |

### TypeScript Strictness (tsconfig.app.json)
`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `erasableSyntaxOnly` (⇒ **no `enum`, no `namespace`, no constructor parameter properties**), `verbatimModuleSyntax` (⇒ `import type`), `noUnusedLocals/Parameters`. Lint uses `recommendedTypeChecked` + `no-explicit-any`, `no-non-null-assertion`, `consistent-type-imports`, `switch-exhaustiveness-check`.

---

## 🔐 Zero Hardcoding & Environment Variable Isolation
To guarantee security, reusability, and clean environment propagation, the following rules apply:
*   **Absolute Environment Separation:** No backend URLs, tenant identifiers, API timeout variables, or configuration keys may be hardcoded anywhere in the codebase.
*   **Vite Configuration Enforce:** All external parameters must be ingested via `import.meta.env` and strictly validated using a root-level Zod configuration schema (`src/lib/env.ts`) during the early build phase. If an environment variable is missing, the application must fail to build immediately.
    *   Implementation: the schema lives in `src/lib/env.schema.ts` (environment-neutral) and is executed by **both** `vite.config.ts` (`loadEnv` → fails `vite dev`/`vite build` before compilation) and `src/lib/env.ts` (runtime, exports the typed `env` object).
    *   Application code imports `env` from `@/lib/env`. **Never read `import.meta.env.VITE_*` directly** (only Vite built-ins such as `import.meta.env.DEV`).
*   **Variable Prefixing:** All client-accessible configuration keys must carry the `VITE_` prefix (e.g., `VITE_API_BASE_URL`).
*   **Naming Convention Agnosticism:** The frontend core must remain detached from specific database engines (PostgreSQL, SQL Server, MongoDB, or Supabase). Property casing translation (e.g., handling PascalCase or snake_case formats from decoupled API configurations) must be isolated completely inside contract mapping models or automated serialization configurations within the generic API client network layer.
    *   Implementation: `VITE_API_PROPERTY_CASING` (`camel | pascal | snake | none`) drives `lib/casing.ts`, applied only inside `lib/apiClient.ts` interceptors and `GenericHubService`. The app always works in camelCase.

### Variable Catalogue (`.env.example`)
| Variable | Purpose |
|----------|---------|
| `VITE_APP_NAME` | Display name (header, `<title>`) |
| `VITE_API_BASE_URL`, `VITE_API_TIMEOUT_MS` | HTTP API root and timeout |
| `VITE_API_PROPERTY_CASING` | Wire casing of the backend |
| `VITE_API_RESPONSE_ENVELOPE` | `true` if every response is `ApiResponse<T>` |
| `VITE_TENANT_STRATEGY` (`subdomain \| path \| none`), `VITE_TENANT_HEADER_NAME`, `VITE_TENANT_ROOT_DOMAIN` | Multi-tenant resolution |
| `VITE_AUTH_LOGIN_PATH`, `VITE_AUTH_REFRESH_PATH`, `VITE_AUTH_LOGOUT_PATH`, `VITE_AUTH_ME_PATH` | Auth endpoints |
| `VITE_HUB_BASE_URL` (empty = disabled), `VITE_HUB_MAX_RETRY_DELAY_MS`, `VITE_HUB_MAX_RETRIES` | Real-time hub |
| `VITE_QUERY_STALE_TIME_MS`, `VITE_DEFAULT_PAGE_SIZE` | Data layer defaults |
| `VITE_STORAGE_NAMESPACE` | Browser storage key prefix |
| `VITE_ENABLE_MOCKS` (optional, default `false`) | Dev-only in-browser mock backend (MSW) |

Adding a variable = add it to `env.schema.ts`, `vite-env.d.ts`, `.env.example` and `.env.development` in the same change.

---

## 🔌 Backend Contract (expected by the generic core)
| Concern | Contract |
|---------|----------|
| Signup | `POST {REGISTER_PATH}` `{ username, displayName, email, password, confirmPassword }` → 201 `{ accessToken, user }` + refresh cookie (least-privilege scopes); field errors as ValidationProblem |
| Login | `POST {LOGIN_PATH}` `{ username, password }` → `{ accessToken, user? }`; sets httpOnly refresh cookie |
| Refresh | `POST {REFRESH_PATH}` (cookie) → `{ accessToken }` |
| Me | `GET {ME_PATH}` → `{ id, displayName, email?, roles[], permissions[] }` |
| Logout | `POST {LOGOUT_PATH}` clears the cookie |
| Paging | `GET /resource?page=&pageSize=&search=&sort=field.asc,field2.desc` → `PaginatedResponse<T>` (`data`, `totalCount`, `pageSize`, `currentPage`) or a bare array |
| Errors | RFC 7807/9457 ProblemDetails (ASP.NET Core default); `errors` dictionary is mapped onto form fields |
| CORS | `AllowCredentials` + explicit origin (cookies are sent with `withCredentials`) |
| Tenancy | Header `{VITE_TENANT_HEADER_NAME}`; hubs also receive `?tenant=` |

| Update | `PUT /resource/{id}` → **200 + the saved entity** (written straight into the detail cache) |
| Validation | 400 `ValidationProblem`; `errors` keys are **camelCase field names** (`email`, `cityId`), messages are user-facing |
| Lookups | `GET /lookups/<lookup>` → `[{ id, name }]` ordered by name, readable by any signed-in user (generic `lookupQueries` + `<LookupSelect>`); managing the same data is a separate, permission-protected resource (`/countries`...) |
| Users | `GET /users?…&isActive=`, `GET /users/{id}`, `GET /users/permissions` → `{ scopes }`, `PUT /users/{id}` `{ displayName, email, roles[], permissions[], isActive }` (no create: signup; no delete: deactivate) |
| In use | Deleting a row still referenced → **409** ProblemDetails with a human `detail` (shown next to the delete button) |
| Bulk actions | `POST /resource/bulk-delete` `{ ids }` → `{ deletedCount }` |
| Permissions | Access token carries `permission` claims; every endpoint enforces the same scopes as the UI (wildcards `res:*`, `*`) |

Different backend? Override `BaseApiService.toQueryParams()` / `toPaginated()` / `parseEntity()`; never fork the generic layer.

### Reference Backend — https://github.com/Fuema/enterprise-core-api
Local clone: `C:\Users\fuema\source\repos\enterprise-core-app-claude-server` (separate git repository, `main` tracks `origin/main`).
ASP.NET Core 10 minimal API + EF Core 10 + SQL Server (`AngularCrudApi`). Implements every row above; its `README.md` is the backend's manual (run, endpoints, "Adding a resource").
*   **Run:** `dotnet run --launch-profile http` → `http://localhost:7077` (Swagger `/swagger`, sample requests `AngularCrudApi.http`). Development startup applies `Database/Scripts/*.sql` (idempotent: `AppUsers`, `RefreshTokens`, unique index on `tblEmployeeMaster.EmailId`) and seeds `admin`/`manager`/`viewer` (password = username) when `AppUsers` is empty.
*   **Frontend against it:** create `.env.development.local` (owner, not committed) with `VITE_API_BASE_URL=http://localhost:7077/api` and `VITE_ENABLE_MOCKS=false`. The e2e suite keeps using the mock (its env is fixed in `e2e/e2e.env.ts`).
*   **Auth:** `Auth/` — HS256 JWT (15 min, claims `sub`, `name`, `email`, `role`, `permission`), refresh token = random 384-bit value stored as SHA-256 in `RefreshTokens`, single-use with rotation and reuse detection, cookie `ec_refresh` (`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth`). Login is rate-limited (10/min/IP). `Jwt:SigningKey` comes from `dotnet user-secrets` / `Jwt__SigningKey`; Development falls back to an ephemeral key; other environments fail fast without one.
*   **Policies:** one per scope in `Auth/Permissions.cs` (`Permissions.All`); groups use `.RequireAuthorization(Permissions.EmployeesRead)` and endpoints add write/delete. Scopes must equal the frontend `*_PERMISSIONS` constants. Current scopes: `employees`, `countries`, `states`, `cities` × `read|write|delete`.
*   **Signup:** `POST /api/auth/register` (rate-limited like login). `Signup` config section: `Enabled`, `DefaultRoles` (`User`), `DefaultPermissions` (`employees:read`). Granting more access = update `dbo.AppUsers.Permissions` (no user-admin UI yet).
*   **Users:** `Endpoint/UserEndpoints.cs` (`users:read` / `users:write`). Permissions are validated against `Permissions.All` (`IsGrantable`: a scope, `resource:*` or `*`); an admin cannot deactivate themselves or drop their own `users:write`; deactivating revokes the account's refresh tokens (signed out at the next refresh, ≤ `Jwt:AccessTokenMinutes`). Permission changes apply from the user's next token or sign-in.
*   **Locations:** `Endpoint/CountryEndpoints.cs`, `StateEndpoints.cs`, `CityEndpoints.cs` (paged CRUD with usage counts, unique names per parent, 409 while in use, no re-parenting while children/employees exist; a city's country is copied from its state); `LookupEndpoints.cs` serves `/api/lookups/*` for dropdowns. Demo manager = employees read/write, countries + states read, cities read/write (script `002` upgrades an older seed).
*   **Generic building blocks** (`Infrastructure/`): `PageRequest` (`[AsParameters]`, page size clamped 1–100) + `ToPagedAsync()` → `PagedResponse<T>`; `SortMap<T>` (allow-listed `field.asc,field.desc`, default sort, never SQL from input); `.WithValidation<TRequest>()` (DataAnnotations → camelCase `ValidationProblem`; minimal APIs do not run DataAnnotations on their own).
*   **Rules:** response DTOs are classes with `init` properties (positional records stop EF from composing `Where/OrderBy` on the projection); cross-field rules return `Results.ValidationProblem` keyed by field; unique-index violations (SQL 2601/2627) map to the field; schema changes are new idempotent `Database/Scripts/00N_*.sql` files (the DB is database-first, no EF migrations).
*   Version control follows the same rules as this repo (Conventional Commits, explicit staging, no secrets: `Jwt:SigningKey` only in user-secrets / environment). A change to the API contract is committed in BOTH repositories, with matching Change Log entries.

### Mock Backend (`src/mocks/`, MSW)
*   Enabled only when `vite dev` runs with `VITE_ENABLE_MOCKS=true`; loaded through a dynamic import in `main.tsx`, so it never reaches production bundles. Requires `public/mockServiceWorker.js` (`npx msw init public --save`).
*   Implements the contract above **through the real network layer**: responses honour `VITE_API_PROPERTY_CASING` and `VITE_API_RESPONSE_ENVELOPE`; errors are ProblemDetails; access tokens expire after 60 s to exercise silent refresh; the refresh "cookie" is simulated in `sessionStorage`.
*   Demo users: `admin/admin` (`*`), `manager/manager` (`employees:read|write`, `countries:read`, `states:read`, `cities:read|write`), `viewer/viewer` (`employees:read`). Signup adds accounts with `employees:read` until the next page reload.
*   **A full page load reseeds the mock DB** (and forgets signed-up accounts): e2e tests that create data and then use it must navigate client-side (click links), never `page.goto`.
*   Resources: `/employees` (137 seeded rows; paging, multi-sort, multi-term search incl. city/state/country, `countryId` + `gender` filters, validation with the API's messages, location-consistency + duplicate-email rules, permission-gated delete and `bulk-delete`) and the location lookups `/countries`, `/countries/:id/states`, `/states/:id/cities`. Handlers mirror the .NET endpoints one-to-one; when the API changes, change the mock in the same commit.
*   Test hooks on `window.__mockApi` (present only while mocks run): `expireAccessTokens()` forces the silent-refresh path, `stats()` returns `{ loginCount, refreshCount }`. Used by the e2e suite; never referenced by app code.
*   Logout invalidates the refresh session immediately (before the simulated latency), like a real server.
*   Shared list behaviour for new mock resources: `src/mocks/paging.ts` (`listPage(rows, url, { sortable, searchable, defaultSort })`, same rules as the API's `PageRequest`/`SortMap`).
*   Rule: every new feature resource gets a handler file in `src/mocks/handlers/` registered in `src/mocks/browser.ts`. Mock DTOs live in `src/mocks/db.ts` and must NOT import feature types (the mock plays the backend).

---

## 📂 Core Folder Architecture
Generate a monorepo-ready layout adhering strictly to a **domain-driven feature structure**, splitting generic layers from concrete extensions.

```text
(repository root)
├── agents.md             # This specification (single source of truth for agents)
├── README.md             # Human quick start
├── setup.ps1             # One-command setup + verification (npm run setup)
├── playwright.config.ts  # e2e runner: own dev server on :5174 with mocks + fixed env
├── e2e/                  # Automated browser checklist
│   ├── e2e.env.ts        # Fixed VITE_* environment for the e2e server (keep in sync with env.schema.ts)
│   ├── helpers.ts        # loginAs, table/column readers, mock hooks, breadcrumb locator
│   ├── global.d.ts       # window.__mockApi typing for page.evaluate
│   ├── auth.spec.ts      # 6 tests: redirects, validation, server errors, session restore, logout, guards
│   └── employees.spec.ts # 11 tests: permissions, CRUD, URL state, search memory, silent refresh, 404
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json / tsconfig.e2e.json
├── vite.config.ts / vitest.config.ts / eslint.config.js / components.json
├── public/               # favicon.svg, mockServiceWorker.js (generated by msw init)
├── agents/
│   └── commit-and-push.md  # Release agent: validate → stage → secret scan → commit → push (two confirmations)
├── scripts/
│   ├── pin-versions.mjs    # "latest" → ^installed versions (npm run deps:pin)
│   └── check-secrets.mjs   # Secret scan of staged changes (npm run check:secrets)
└── .env.example          # Documented variables (.env.* files are developer-owned)

src/
├── components/           # STEP 2: GLOBAL GENERIC COMPONENT LAYER
│   ├── shared/           # Completely abstract components
│   │   ├── GenericDataTable.tsx      # Dynamic grid accepting generic TData models
│   │   ├── GenericFormElement.tsx    # Unified form orchestrator (+ FormRootError, FormSubmitButton)
│   │   ├── GenericErrorBoundary.tsx  # Abstract fallback capturing runtime and server faults (+ RouteErrorComponent)
│   │   ├── GenericRouteGuard.tsx     # Reusable identity permission gateway (subtree)
│   │   ├── LookupSelect.tsx          # Native select bound to a numeric id over [{ id, name }] lookups
│   │   ├── GenericDeleteButton.tsx   # Guarded delete with inline confirm + server error (any BaseApiService)
│   │   ├── GenericActionGuard.tsx    # Component-level permissions gate for granular UI blocks
│   │   └── DynamicBreadcrumbs.tsx    # Meta-driven navigation trail components
│   └── ui/               # Generic Shadcn/UI primitives (Vetted/wrapped standard components)
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Label.tsx
│       ├── Table.tsx
│       ├── NativeSelect.tsx  # Styled native <select> (works with FormControl)
│       ├── Badge.tsx
│       └── Form.tsx      # Pre-wrapped React Hook Form accessible primitives
├── features/             # EXTENSION TIER
│   ├── auth/             # Modular login/session framework
│   │   ├── components/   # LoginForm, SignupForm
│   │   ├── hooks/        # useLogin, useSignup, useLogout
│   │   ├── schemas/      # loginSchema, signupSchema (Zod, mirrors RegisterRequest)
│   │   ├── services/     # authService (login, register, logout, restoreSession, fetchCurrentUser)
│   │   ├── store/        # Zustand auth store + permission selectors
│   │   ├── types/        # AuthUser, response schemas
│   │   ├── guards.ts     # requireAuthentication, requirePermissions (router beforeLoad)
│   │   └── index.ts      # Public API + initializeAuth (registers the auth bridge)
│   ├── employees/        # STEP 3: REFERENCE FEATURE (copy this shape for new features)
│   │   ├── components/   # employeeColumns.tsx (module-level columns), DeleteEmployeeButton.tsx, BulkDeleteEmployeesButton.tsx (guarded actions)
│   │   ├── forms/        # employeeFormSchema.ts (Zod + defaults/mappers), EmployeeForm.tsx (GenericFormElement), EmployeeLocationFields.tsx (country→state→city cascade)
│   │   ├── services/     # employeeService.ts (extends BaseApiService, + deleteMany) + employeeQueries (entityQueries) + locationQueries (re-export of locations/lookups)
│   │   └── types/        # employee.ts (entity schema, sortable fields, permissions), employeeSearch.ts (URL schema + filter mapper)
│   ├── users/            # Account admin: types (user, userSearch), services (userService + permissionCatalog query), forms (UserForm, PermissionEditor, permissionMatrix.ts pure helpers + test), components (userColumns)
│   └── locations/        # Domain group: three sub-features with the employees shape + shared lookups
│       ├── lookups.ts    # locationLookups (countries/states/cities dropdowns) — the ONLY file other features may import
│       ├── countries/    # types (country, countrySearch), services (countryService + countryMutationOptions), forms, components
│       ├── states/       # same shape; countryId filter + country select
│       └── cities/       # same shape; countryId/stateId filters + country→state cascade (countryId is UI-only)
├── app/
│   └── featureRegistry.ts  # FEATURES: one entry per feature (label, route, icon, permissions, useCount) → header nav, dashboard cards, access matrix
├── hooks/                # Generic hooks
│   ├── useEntityMutations.ts         # useCreateEntity / useUpdateEntity / useDeleteEntity
│   ├── useHubConnection.ts           # Hub lifecycle + status (useSyncExternalStore)
│   └── useTableSearchNavigation.ts   # Binds GenericDataTable to the current route's search
├── lib/                  # Runtime Engines (never import from features/)
│   ├── env.schema.ts     # Zod schema shared by vite.config.ts and runtime
│   ├── env.ts            # Strict Zod environment variable parsing structure
│   ├── apiClient.ts      # Axios instance with tenant header, casing, single-flight token refresh
│   ├── apiError.ts       # ApiError: the only error type leaving the network layer
│   ├── authBridge.ts     # Dependency-inversion seam lib/ ⇄ features/auth
│   ├── casing.ts         # Wire casing translation (pure, tested)
│   ├── tenant.ts         # Subdomain / path tenant resolution (pure, tested)
│   ├── permissions.ts    # Scope evaluation with wildcards (pure, tested)
│   ├── queryClient.ts    # Configured TanStack Query Client instance
│   ├── queryKeys.ts      # Hierarchical key factory shared by services + hubs
│   ├── tableSearch.ts    # URL contract for tables (Zod schema factory, defaults, sort helpers)
│   ├── searchMemory.ts   # In-memory last-search-params per path
│   ├── formErrors.ts     # ApiError → React Hook Form error mapping
│   ├── dataTable.ts      # TanStack Table v9 feature set + typed column helper
│   ├── router.ts         # TanStack Router initialization tree with state memory configurations
│   └── utils.ts          # cn(), assertNever(), isSafeRelativePath()
├── mocks/                # Dev-only MSW mock backend (browser.ts, db.ts, http.ts, handlers/)
├── routes/               # File-based routes (TanStack Router)
│   ├── __root.tsx        # Root: search-memory restore, error + not-found components
│   ├── _authenticated.tsx            # Protected layout group (beforeLoad guard, 'Home' crumb, feature nav)
│   ├── _authenticated/index.tsx      # Dashboard: feature cards with record counts + "Your access" matrix (from FEATURES)
│   ├── _authenticated/employees.tsx  # Feature layout: 'Employees' crumb + read permission for all children
│   ├── _authenticated/employees/index.tsx         # List (URL-driven table, country/gender filters, bulk delete)
│   ├── _authenticated/employees/new.tsx           # Create (requires employees:write)
│   ├── _authenticated/employees/$employeeId.tsx   # Detail/edit (typed numeric param, breadcrumb from loader data)
│   ├── _authenticated/{countries,states,cities}.tsx + /{index,new,$<entity>Id}.tsx   # Same pattern as employees
│   ├── login.tsx         # + "Create an account" link (VITE_AUTH_SIGNUP_ENABLED)
│   ├── _authenticated/users.tsx + /users/{index,$userId}.tsx   # Users list (status filter) + detail/edit (no create, no delete)
│   ├── signup.tsx        # Public self-service registration → signed in → dashboard
│   └── forbidden.tsx
├── services/             # STEP 2: GENERIC SERVICE LAYER
│   ├── BaseApiService.ts # Abstract base class for HTTP actions with generic type contracts
│   ├── entityQueries.ts  # queryOptions factories (list/detail) for any BaseApiService
│   ├── lookupService.ts  # Generic [{ id, name }] lookups: lookupItemSchema, fetchLookup, lookupQueries.list(path, enabled)
│   ├── StorageService.ts # Local browser memory / storage abstraction layer
│   └── GenericHubService.ts # Abstract connection consumer for real-time WebSocket/SignalR events
├── types/                # STEP 2: GENERIC SYSTEM TYPE DEFINITIONS
│   ├── generic-api.ts    # ApiResponse<T>, PaginatedResponse<T>, GenericTableFilter<T>, QueryParams, MutationPayloads, ProblemDetails
│   ├── generic-form.ts   # FormSchemaConfig<T>, ValidationRules, FieldErrorMap
│   └── router-meta.ts    # RouterContext, StaticDataRouteOption augmentation (breadcrumb, persistSearch, permissions)
├── routeTree.gen.ts      # GENERATED by the router plugin / `tsr generate` (do not edit)
├── App.tsx               # Providers wrapper (QueryClientProvider, RouterProvider)
└── main.tsx              # Application mount point (initializeAuth → restoreSession → render)
```

**Dependency rule:** `lib/` → nothing app-specific · `services/`, `hooks/`, `components/` → `lib/`, `types/` (+ `features/auth/store` for guards) · `features/*` → everything generic · nothing imports a concrete feature except `routes/`.

---

## 🛠️ Step 2: The Generic Solution Specifications (The Core Blueprint)

The execution of **Step 2** is complete only when the following layers are fully written as completely un-opinionated, type-parameterized variables (`<T>`).

### 1. Generic Types & Contexts (`types/`)
*   Define global API network abstractions:
    *   `ApiResponse<T>`: Wraps basic server payload envelopes cleanly.
    *   `PaginatedResponse<T>`: Standardizes server pagination arrays (`data: T[]`, `totalCount: number`, `pageSize: number`, `currentPage: number`).
    *   `GenericTableFilter<T>`: Maps page tokens, search parameters, and strongly-typed sort configurations matching the URL constraints.

### 2. Generic Services (`services/` & `lib/`)
*   **BaseApiService<T>:** Build an abstract base class utilizing an Axios HTTP fetch cluster. It must receive a generic parameter `<T>` representing the core data structure entity type and accept variable backend route variables dynamically at instantiation.
    *   Signature: `BaseApiService<TEntity, TId = string, TCreate = Omit<TEntity,'id'>, TUpdate = Partial<TCreate>>`, optional Zod `schema` for runtime contract validation, exposes `keys` (query-key factory).
*   It must expose fully type-parameterized CRUD functions: `getAll`, `getById`, `create`, `update`, and `delete`.
*   **Multi-Tenant & Identity Interceptor:** The central Axios configuration layer (`apiClient.ts`) must extract active multi-tenant context from the root path parameters or browser subdomain, appending this dynamically as an HTTP header (e.g., `X-Tenant-ID`). It must execute a dual-token interceptor pipeline to seamlessly handle cookie-based silent credential refresh attempts without interrupting active data calls.
    *   Access token: memory only (Zustand). Refresh token: httpOnly cookie. Concurrent 401s share one refresh (single-flight) and are replayed once.
*   **GenericHubService<T>:** Implement an abstract connection engine managing real-time WebSocket/SignalR channels. It must cleanly handle connecting, disconnecting, and automatic reconnection throttling. It must accept an entity stream configuration to pipe real-time backend broadcast events directly into automatic **TanStack Query data cache updates** without feature-specific code overhead.
    *   Bindings: `{ event, action: 'upsert' | 'remove' | 'invalidate' }`. After a reconnect the resource is invalidated (missed events).

### 3. Generic Router Configurations & State Memory (`lib/router.ts`)
*   Configure **TanStack Router** to use file-based routing.
*   Implement a protected layout group (`_authenticated.tsx`) acting as a route guard. It must evaluate user session states inside the **Zustand store** in its `beforeLoad` hook, executing a `redirect({ to: '/login' })` if unauthenticated.
*   **Isomorphic Layout State Recovery:** Embed an abstract search parameter persistence mechanism inside the router pipeline. The global layout router must store an in-memory session history tracking a user's last configured search parameters, page numbers, and table filters. If they navigate back from a deep route branch, the system must automatically reconstruct the deep-link query string to preserve layout context.
    *   Recording: `router.subscribe('onResolved')` in `lib/router.ts`. Restoring: root `beforeLoad` when a path is entered with empty search. Opt-out: `staticData: { persistSearch: false }`. Explicit "reset filters" must call `searchMemory.forget(pathname)` first.
    *   **Required for every route with `validateSearch` defaults:** `search: { middlewares: [stripSearchParams(defaults)] }` (defaults from `tableSearchDefaults()`). Without it TanStack Router writes the defaults into the URL (`?page=1&pageSize=20`), the URL is never empty and restore never fires (bug found by the e2e suite).

### 4. Generic Shadcn/UI & Presentation Components (`components/shared/`)
*   **GenericDataTable<TData>:** Implement an un-opinionated wrapper table built using TanStack Table structures and Shadcn components. It must accept a generic dataset array (`data: TData[]`) and explicit configuration arrays (`columns: ColumnDef<TData, TValue>[]`). It must hook up pagination, sorting, and row-selection states directly to **TanStack Router's** typed search validation schema out of the box.
    *   URL contract via `createTableSearchSchema(sortableFields, { defaultPageSize })` (extend it with feature filters via `.extend({...})`); binding via `search={Route.useSearch()}` + `onSearchChange={useTableSearchNavigation<TSearch>()}`.
    *   TanStack Table v9: columns are `DataTableColumn<TData>[]` built with `dataTableColumnHelper<TData>()` (`lib/dataTable.ts`), defined at module scope.
*   **DynamicBreadcrumbs:** A structural component that hooks into TanStack Router's route metadata context to automatically output layout paths and contextual breadcrumbs without hardcoded views.
    *   Metadata: `staticData: { breadcrumb: string | ({ params, loaderData }) => string }`.
*   **GenericActionGuard:** Create a lightweight, component-level permission guard. It must wrap specific, granular interface elements (like a "Delete" button or "Edit" tab) and take an array of required access control strings. It must evaluate these criteria against the current authenticated scopes stored inside the `Zustand` store, dynamically hiding or revealing interface actions securely at the component level.
    *   Scopes support wildcards (`employees:*`, `*`). Client checks are UX only; the API must enforce.

### 5. Generic Forms & Error Mapping Layer (`components/shared/`)
*   **GenericFormElement<TFormValues>:** Build a reusable, schema-driven form wrapper. It must accept a **Zod** validator schema constraint (`schema: ZodType<TFormValues>`) and an execution callback (`onSubmit: (data: TFormValues) => void`).
*   It must automatically bind **React Hook Form** to the child layout using React Context, allowing children fields to seamlessly consume Shadcn/UI inputs (`<FormField>`, `<FormLabel>`) with zero performance lagging or rendering drops when values change.
*   Error mapping: an `ApiError` thrown by `onSubmit` is mapped automatically — ProblemDetails field errors to fields (`Items[0].Name` → `items.0.name`), everything else to `root.server` (`<FormRootError />`).

---

## 🧩 Step 3: Employees (Reference Implementation)
A feature contains **configuration and domain code only**. Everything below inherits from or instantiates the generic layer; no generic file had to be forked.

| Concern | File | Generic building block |
|---------|------|------------------------|
| Entity contract | `features/employees/types/employee.ts` | Zod `employeeSchema` → `Employee`; `EMPLOYEE_SORTABLE_FIELDS` (`satisfies SortableField<Employee>[]`); `EMPLOYEE_PERMISSIONS` |
| URL contract | `features/employees/types/employeeSearch.ts` | `createTableSearchSchema(...).extend({ countryId, gender })` + `toEmployeeFilter()` → `GenericTableFilter<Employee>` |
| API access | `features/employees/services/employeeService.ts` | `class EmployeeService extends BaseApiService<Employee, number, EmployeeInput, EmployeeInput>` (+ `deleteMany(ids)`); `employeeQueries = entityQueries(service)`; `locationQueries` over `lookupQueries` |
| Form | `features/employees/forms/*` | Zod `employeeFormSchema` (`satisfies z.ZodType<EmployeeInput>`, same rules/messages as the API's `EmployeeRequest`) + `<GenericFormElement>`; `EmployeeLocationFields` = 3 × `<LookupSelect>` via `useFormContext`/`useWatch`, a parent change clears its children in the change handler (not an effect, so edit mode keeps saved values) |
| Grid | `features/employees/components/employeeColumns.tsx` | `dataTableColumnHelper<Employee>()`, column ids = sortable fields |
| Guarded action | `features/employees/components/DeleteEmployeeButton.tsx`, `BulkDeleteEmployeesButton.tsx` | `<GenericActionGuard>` + `useDeleteEntity(service)` / `useMutation(service.deleteMany)`; inline two-step confirm; bulk ids come from the table's URL `selected` param, cleared on success |
| Routes | `routes/_authenticated/employees*.tsx` | layout (crumb + `requirePermissions`), list (`validateSearch`, `loaderDeps`, `loader`), new (`useCreateEntity`), detail (`params.parse`, `notFound`, crumb resolver, `useSuspenseQuery`, `useUpdateEntity`) |
| Navigation | `routes/_authenticated.tsx`, `_authenticated/index.tsx` | guarded header link + home card |
| Mock API | `mocks/handlers/employees.ts`, `mocks/handlers/lookups.ts` | mirrors the .NET endpoints: paging/sort/search/filters, ProblemDetails validation, location + duplicate-email rules, bulk delete, lookups, permission checks |
| Real API | `enterprise-core-app-claude-server/Endpoint/EmployeeEndpoints.cs`, `LookupEndpoints.cs` | see 🔌 Reference Backend |

**Behaviours to verify in the browser (mock users):**
1. `viewer`: Employees link visible; no "New employee", no delete icons; detail page is read-only.
2. `manager`: can create and edit; no delete icons (`employees:delete` missing).
3. `admin`: everything, including delete (inline confirm).
4. Sort a column, filter by country and gender, search (e.g. `pune`), go to page 3 → URL updates; open a row → click the **Employees** breadcrumb or **Back to list** → page/sort/filter are restored (search memory). **Reset** clears them.
5. Create an employee with an email that already exists → the server error appears under **Email** (ProblemDetails mapping).
5b. In the form, pick Country → State → City; changing the country clears State and City; editing an employee shows its saved location.
5c. `admin`: tick two rows → **Delete selected (2)** → **Confirm delete 2** → rows disappear, selection cleared (`manager`/`viewer` never see the button).
6. Leave the app idle > 60 s, then change page → Network tab shows `401` → `/auth/refresh` → retried request; no visible interruption.
7. `/employees/999999` → "Employee not found"; `/employees/abc` → not found.

---

## 🧭 Feature Development Procedure (repeat for every new feature)
Use `features/employees` as the template. Replace `<entity>` / `<Entity>` / `<entities>`.

**0. Prerequisites**
- Generic layer untouched by default. If the feature needs a capability the generic layer lacks, add it there **generically** (with tests), log it in the Change Log, then use it.
- Agree the API contract (paths, fields, sortable columns, permission scopes) before coding.

**1. Contract & types** — `features/<entities>/types/<entity>.ts`
- Zod `<entity>Schema`; `type <Entity> = z.output<...>`; `<Entity>Input = Omit<<Entity>, 'id'>` (or a dedicated type).
- `<ENTITY>_SORTABLE_FIELDS = [...] as const satisfies readonly SortableField<<Entity>>[]`.
- `<ENTITY>_PERMISSIONS = { read, write, delete } as const` (strings must match the API).

**2. URL contract** — `features/<entities>/types/<entity>Search.ts`
- `createTableSearchSchema(SORTABLE, { defaultPageSize: env.VITE_DEFAULT_PAGE_SIZE }).extend({ ...featureFilters })` (every filter `.optional().catch(undefined)`).
- `to<Entity>Filter(search)` → `GenericTableFilter<<Entity>>` (feature filters go into `filters`).

**3. Service** — `features/<entities>/services/<entity>Service.ts`
- `class <Entity>Service extends BaseApiService<<Entity>, <IdType>, <Entity>Input, <Entity>Input> { constructor() { super('/<entities>', { schema: <entity>Schema }); } }`
- `export const <entity>Queries = entityQueries(<entity>Service)`. Override `toQueryParams`/`toPaginated`/`parseEntity` only for backend deviations.

**4. Form** — `features/<entities>/forms/`
- Foreign keys use `<LookupSelect>` with `lookupQueries.list(path, enabled)` (numeric id, `0` = none, schema `z.number().int().positive(msg)`). Cascades: watch the parent with `useWatch`, clear children inside the parent's change handler.
- `<entity>FormSchema` (`satisfies z.ZodType<<Entity>Input>`), `empty<Entity>Form`, `to<Entity>FormValues(entity)`.
- `<Entity>Form` = `<GenericFormElement>` + `FormField` blocks; `onSubmit` must `await` the mutation so `ApiError` field errors are mapped.

**5. Grid & actions** — `features/<entities>/components/`
- `<entity>Columns` at **module scope** with `dataTableColumnHelper<<Entity>>()`; column ids equal sortable field names; `col.display({ id: 'actions', enableSorting: false, ... })` for actions.
- Mutating actions wrapped in `<GenericActionGuard permissions={[...]}>`; no `window.confirm` (inline confirmation).

**6. Routes** — `routes/_authenticated/`
- `<entities>.tsx` layout: `staticData: { breadcrumb: '<Entities>', permissions: [read] }`, `beforeLoad: requirePermissions([read])`, `component: Outlet`.
- `<entities>/index.tsx`: `validateSearch`, `search: { middlewares: [stripSearchParams(<entity>SearchDefaults)] }` (mandatory, see search memory), `loaderDeps: ({ search }) => ({ filter: to<Entity>Filter(search) })`, `loader: ensureQueryData(<entity>Queries.list(deps.filter))`; component uses `useQuery({ ...list(filter), placeholderData: keepPreviousData })`, `const EMPTY_ROWS: <Entity>[] = []` at module scope, `useTableSearchNavigation<<Entity>Search>()`, Reset = `searchMemory.forget(pathname)` + `navigate({ search: {} })`.
- `<entities>/new.tsx`: `beforeLoad: requirePermissions([write])`, `persistSearch: false`, `useCreateEntity`.
- `<entities>/$<entity>Id.tsx`: `params: { parse, stringify }` for non-string ids; loader → `ensureQueryData(detail)`, 404 → `throw notFound()`; breadcrumb resolver validates `loaderData` with the Zod schema; page uses `useSuspenseQuery(detail)`; edit form inside `<GenericActionGuard permissions={[write]} fallback={readOnlyView}>`.

**7. Navigation & dashboard** — add ONE entry to `FEATURES` in `src/app/featureRegistry.ts` (label, `to`, icon, `<ENTITY>_PERMISSIONS`, `useCount` via `<entity>Queries.list({ page: 1, pageSize: 1 })`). The header link, the dashboard card (with record count) and the "Your access" row are generated and guarded by the feature's read scope; never hand-write nav links.

**8. Mock API** — `mocks/handlers/<entities>.ts` + register in `mocks/browser.ts`; DTOs and seed data in `mocks/db.ts` (no feature imports); use `authorize(request, [scope])`, `ok()`, `problem()`, `queryParam()`; add demo-user scopes if needed.

**8a. Cross-feature data** — a feature never imports another feature, except a domain group's declared public file (e.g. `@/features/locations/lookups`). Mutations whose data feeds other screens pass `mutationOptions` (`{ invalidate: [lookupQueries.all] }`) to `useCreateEntity`/`useUpdateEntity`/`useDeleteEntity`/`<GenericDeleteButton>`.

**8b. Real API** — in the backend repo follow its README "Adding a resource" (entity + DbSet, idempotent SQL script, request DataAnnotations with the SAME messages as the Zod schema, `init`-property response DTO, endpoints with `SortMap`/`ToPagedAsync`/`WithValidation`, scopes in `Auth/Permissions.cs`). Field names, sortable fields, filter names and permission strings must be identical on both sides and in the mock.

**9. Optional real-time** — `class <Entity>Hub extends GenericHubService<<Entity>, <IdType>>` with `{ event, action }` bindings; mount with `useHubConnection(hub)` in the list route.

**10. Tests**
- Unit: any feature mapping/pure logic (`*.test.ts` next to the file, Vitest).
- E2E: `e2e/<entities>.spec.ts` turning the feature's browser checklist into tests (permissions per mock user, CRUD incl. a server-side validation error, URL state + search memory, not-found). Follow the 🧪 Testing Strategy patterns.

**11. Verify** with `npm run verify:all` (see Working Rules) and **document**: update the folder tree, the status table and add a Change Log entry; commit (🌿 Version Control).

---

## ✅ Agent Working Rules
*   **Definition of done:** `npm run verify:all` passes = `verify` (typecheck → lint → unit tests → production build) + `test:e2e` (Playwright, automated browser checklist). Report actual results; never claim success without running it. Playwright records the outcome in `test-results/.last-run.json` (`"status": "passed"`), which an agent can read to confirm a run.
*   **Verification procedure for agents working remotely** (no Windows-native binaries): run `node node_modules/@tanstack/router-cli/bin/tsr.cjs generate`, `node node_modules/typescript/bin/tsc -b` and `node node_modules/eslint/bin/eslint.js .` in the project folder; the owner runs `npm run test`, `npm run build`, `npm run test:e2e` and `npm run dev` on Windows (Vite/Vitest/Playwright need the native binaries and browser).
*   **Before coding against any library, check the INSTALLED major version** (`node_modules/<pkg>/package.json`) and read its bundled agent guides if present (`node_modules/<pkg>/skills/`). `"latest"` pulled new majors twice (TanStack Table 9, MSW 3) whose APIs differed from older documentation.
*   `.env*` files (other than `.env.example`) are owned by the developer; agents must not create or edit them. Document required values in `.env.example` and the Variable Catalogue instead.
*   **Every change is logged** in the 📝 Change Log (date, what, why, files).
*   No `any`, no non-null assertions, no `enum`. Type assertions only at documented runtime boundaries (JSON from the network, router paths/search derived at runtime) and always with a comment.
*   Errors leaving the network layer are always `ApiError`. Never `catch` and swallow without mapping or rethrowing.
*   The URL is the source of truth for table state; do not mirror it in component state or Zustand.
*   Tokens are never written to `localStorage`/`sessionStorage`. `StorageService` is for non-sensitive preferences only.
*   Generated `src/routeTree.gen.ts` is never edited by hand.
*   New shadcn primitives: `npx shadcn@latest add <name>` (generates lowercase file names into `components/ui/`; keep or rename consistently).

---

## 🧪 Testing Strategy
| Layer | Tool | Location | Scope |
|-------|------|----------|-------|
| Unit | Vitest (node env) | `src/**/*.test.ts` | Pure logic: casing, tenancy, permissions, search memory, table URL contract, env schema |
| Static | `tsc -b` (4 projects) + ESLint type-checked | whole repo | Types, lint rules |
| End-to-end | Playwright (Chromium) | `e2e/*.spec.ts` | The browser checklist of every feature, against the MSW mock |

**E2E rules and patterns (learned while building the suite):**
*   The suite starts its own server (`npx vite --port 5174 --strictPort`) with the fixed environment in `e2e/e2e.env.ts`; process variables override `.env` files, so results do not depend on local configuration. `reuseExistingServer` is on locally, off in CI.
*   Every test gets a fresh browser context; every full page load reseeds the mock DB. Tests must not depend on each other.
*   Select by role/label/text (accessible names), never by CSS classes. Scope ambiguous links (`breadcrumb(page)` vs header navigation).
*   **The table keeps the previous page visible while fetching (`keepPreviousData`)**: after changing page/filter/search, assert with `expect.poll(...)` on the new content, not on the mere presence of rows.
*   **Wait for navigations that finish async work** before the next step (e.g. `await expect(page).toHaveURL(/\/login/)` after Sign out); otherwise an in-flight request is aborted and state leaks into the next step.
*   After clicking a link, **wait for the destination's heading** before using labels that also exist on the source page; use `getByLabel(label, { exact: true })` for short labels ("Country" matches "Filter by country").
*   Time-based behaviour (token expiry) is driven through mock hooks (`expireAccessTokens`), never by waiting.
*   Assert URLs with patterns tolerant to extra params (`/\/employees(?:\?|$)/`).
*   Commands: `npm run test:e2e` · `npm run test:e2e:ui` (interactive) · `npm run test:e2e:report` (last HTML report).

---

## 🚀 Setup (`setup.ps1`)
`npm run setup` (or `./setup.ps1`) performs, idempotently: Node version check → create **missing** `.env.development` (mocks on) and, if no production env exists, `.env.production.local` from `.env.example` (never overwrites) → `npm ci` (or `npm install` without lockfile) → `npx msw init public --save` if the worker is missing → `npx playwright install chromium` → `npm run verify` → `npm run test:e2e`. Switches: `-SkipE2E`, `-SkipVerify`. Close running dev servers first (`npm ci` replaces `node_modules`).

---

## 🌿 Version Control
*   Git repository at the project root, default branch `main` (initialised 2026-10-17, first commit `ecc20ea`). Repo-local config: `core.autocrlf=false`, `core.fileMode=false`.
*   Remote: `origin` → **https://github.com/Fuema/enterprise-core-app** (`main` tracks `origin/main`). Push from the developer's machine (Git Credential Manager); remote agents without a linked GitHub account prepare the commit and hand the push to the developer.
*   **Release procedure:** follow [`agents/commit-and-push.md`](agents/commit-and-push.md) — `verify:all` → review → explicit staging → `npm run check:secrets` → Conventional Commit → confirm → commit → confirm → push.
*   **Commit after each validated change** (definition of done met), one logical change per commit; the Change Log entry is part of the same commit.
*   Message format (**Conventional Commits**, from 2026-10-17; the first three commits predate it): `<type>(<scope>): <imperative summary ≤ 72 chars>`, blank line, bullet body (what/why), `Validated: ...` line. Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore` (`!` + `BREAKING CHANGE:` footer for breaking changes). Agent-authored commits end with the `Co-Authored-By:` trailer of the agent.
*   Stage explicit paths only (never `git add .`); `npm run check:secrets` must pass on the staged set (`scripts/check-secrets.mjs`: blocks env files other than `.env.example`/`.env.development`, keys/certificates, `.npmrc`, and token/credential patterns).
*   Never force-push, never `--no-verify`, never amend or rebase commits that are already on `origin`.
*   Committed on purpose: `package-lock.json` (reproducible versions), `src/routeTree.gen.ts`, `public/mockServiceWorker.js`, `.env.example`, `.env.development` (non-secret localhost defaults).
*   **Never commit secrets or real environment endpoints.** `.env.production` currently holds placeholders only; before it receives real values run `git rm --cached .env.production` and add it to `.gitignore`, or use `.env.production.local` (already ignored).
*   Remote agents: git must delete its own lock/temp files, so the session needs delete permission on the project folder; if a git command fails with `unable to unlink ... Operation not permitted`, request that permission and remove the stale `.git/index.lock` before retrying.
*   Windows: a repo created from another user context may trigger "dubious ownership"; fix once with `git config --global --add safe.directory C:/Users/fuema/source/repos/enterprise-core-app-claude`.

---

## 📝 Change Log
Newest first. One entry per working session; list what changed, why, and the key files.

### 2026-10-17 — User administration screen
- **API:** `Endpoint/UserEndpoints.cs` — paged `GET /api/users` (search, `isActive` filter, sort), `GET /api/users/{id}`, `GET /api/users/permissions` (catalog = `Permissions.All`), `PUT /api/users/{id}` (display name, email, roles, permissions, active). New scopes `users:read`, `users:write` (admin `*` has them). Validation: unknown scopes, duplicate email, role format; lock-out guards (no self-deactivation, no removing own `users:write`); deactivation revokes refresh tokens.
- **Frontend:** `features/users` + `/users`, `/users/$userId` routes. `PermissionEditor`: feature × View / Create-edit / Delete grid built from the API catalog, an "All" (`resource:*`) column and an Administrator (`*`) switch; pure logic in `permissionMatrix.ts` with unit tests. Registry entry "Users"; `FeaturePermissions.delete` is now optional and the access matrix shows `n/a` for it.
- **Mock:** `handlers/users.ts` (same rules), `MockUser.isActive/createdAtUtc`, inactive accounts cannot log in or refresh.
- **E2E:** `users.spec.ts` (7 tests: viewer + manager access, grant takes effect at next sign-in, All/expand behaviour, deactivation blocks sign-in, self lock-out guard, status filter); helpers `signOut`, `signInHere` (no reload, so mock changes survive) → 36 tests. Validated: `npm run verify:all` (e2e 36/36).

### 2026-10-17 — Backend under version control
- API published as its own repository: https://github.com/Fuema/enterprise-core-api (first commit `fd49a57`). `_original/` (pre-adaptation backups and transfer bundles) removed. Frontend commit `2d25ff7` pushed to `origin/main`.

### 2026-10-17 — Signup, location management, per-feature authorization, dashboard
- **Signup:** API `POST /api/auth/register` (`RegisterRequest` DataAnnotations + strength/uniqueness rules, `Signup` options, rate-limited, signs in on success); frontend `/signup` route, `SignupForm`, `signupSchema`, `register()`/`useSignup`, link on the login page. Env: `VITE_AUTH_REGISTER_PATH` (default `/auth/register`), `VITE_AUTH_SIGNUP_ENABLED` (default `true`) — both optional, existing `.env` files keep working.
- **Countries / States / Cities CRUD** (API endpoints + `features/locations/*` + 12 routes): paged/sorted/searchable lists with usage counts and filters, create/edit forms (country select, country→state cascade), guarded delete with server 409 "in use" messages, duplicate-name field errors.
- **Per-feature permissions:** `countries|states|cities` × `read|write|delete` on both sides (API policies, route `requirePermissions`, `GenericActionGuard` on every action). Removed `lookups:write`. Demo/seeded manager updated (`002_location_permissions.sql`).
- **Breaking API route change:** dropdown lookups moved from `/api/countries…` to `/api/lookups/countries…` (`/api/countries` is now the paged CRUD resource). Frontend `locationLookups` and the mock follow.
- **Generic additions:** `GenericDeleteButton`, `EntityMutationOptions.invalidate` on the CRUD mutation hooks, `src/app/featureRegistry.ts` (nav + dashboard), mock `paging.ts`.
- **Dashboard:** feature cards with live record counts and a "Your access" matrix (view / create-edit / delete per feature); the demo "Admin action" button is gone.
- **E2E:** `signup.spec.ts` (3), `locations.spec.ts` (7), dashboard/nav permissions test in `auth.spec.ts` → 29 tests.
- Verified here: `tsr generate`, `tsc -b`, ESLint clean. Owner: API + browser check against SQL Server OK.
- **Fixes from the first `verify:all` run (26/29):** (1) generic — search memory restores only when ENTERING a path from another path (`searchMemory.visit` / `recallOnEnter`, root `beforeLoad`); same-path navigations that empty the URL (bulk delete clearing `?selected=`, unticking the last row, clearing the last filter) were being "restored". Unit test added. (2) `LoginForm` validates on submit only: blurring the auto-focused empty username showed "required", shifting the "Create an account" link mid-click. (3) e2e: wait for the target page heading after clicking a "New …" link and use `getByLabel(..., { exact: true })` — "Country" also matched the list's "Filter by country".

### 2026-10-17 — Real .NET backend + Employees on the real domain
- **Backend** (`enterprise-core-app-claude-server`, owner's ASP.NET Core 10 + SQL Server API) adapted to the 🔌 contract: REST `/api/employees` (paging/sort/search/filters, 201/200-with-entity/204, `bulk-delete`), `/api/countries…` lookups as `[{id,name}]`, ProblemDetails everywhere, camelCase validation keys via `WithValidation<T>()`, unique email (rule + index), JWT auth (`/api/auth/login|refresh|me|logout`, rotating httpOnly refresh cookie, permission policies, login rate limit), CORS with credentials and explicit origins, Development DB bootstrap + demo users. Originals kept in `_original/`. Package added: `Microsoft.AspNetCore.Authentication.JwtBearer` 10.0.13.
- **Breaking wire change for that API:** routes and field names changed (`empId`→`id`, `emailId`→`email`, `country/state/city`→`countryName/stateName/cityName`); any older client of the old RPC routes must be updated.
- **Frontend Employees** now uses the real fields (`dateOfBirth`, `gender`, `countryId/stateId/cityId` cascade, `address`, `pincode`); list filters `countryId` + `gender`, Location column, **bulk delete** of selected rows. Removed `department`, `jobTitle`, `hireDate`, `isActive`.
- **Generic additions:** `services/lookupService.ts` (`lookupQueries`), `components/shared/LookupSelect.tsx`.
- **Mock backend** mirrors the new API (`handlers/employees.ts`, new `handlers/lookups.ts`, location seed data in `db.ts`). `.env.example` documents the local API URL.
- **E2E** updated to the new fields; new tests: cascade clearing, bulk delete (19 tests).
- Verified here: `tsc -b` and ESLint clean. Pending (owner, Windows): `dotnet build` + `dotnet run`, `npm run verify:all`, browser check against the real API with `VITE_ENABLE_MOCKS=false`.

### 2026-10-17 — Release process and GitHub remote
- **Pushed** the repository to GitHub: `origin` = https://github.com/Fuema/enterprise-core-app (`main`).
- **Added** `agents/commit-and-push.md`, a release agent rewritten from the owner's `CommitChangesToGitHub` draft: `verify:all` as the gate (no auto-fixing), explicit staging, staged-diff review, secret scan, change-log check, Conventional Commits with body/`Validated:`/trailer, separate confirmations for commit and push, push failure handling, hard safety rules.
- **Added** `scripts/check-secrets.mjs` + `npm run check:secrets` (staged-files secret scanner, Node-only).
- **Changed** commit convention to Conventional Commits (🌿 Version Control).

### 2026-10-17 — Automated acceptance (Playwright) + setup script
- **Added** Playwright e2e suite (`playwright.config.ts`, `tsconfig.e2e.json`, `e2e/*`): 17 tests covering the Step 2/3 browser checklists. `@playwright/test@1.64.1` (dev).
- **Added** `setup.ps1` and scripts `test:e2e`, `test:e2e:ui`, `test:e2e:report`, `verify:all`, `setup`; `.gitignore` for Playwright output.
- **Fixed (generic, found by e2e):** search-memory restore never fired because TanStack Router wrote `validateSearch` defaults into the URL. Added `tableSearchDefaults()` (`lib/tableSearch.ts`, with unit test) and `stripSearchParams` on the employees list route; the rule is now part of the spec and the Feature Development Procedure.
- **Mock:** `window.__mockApi` test hooks (`expireAccessTokens`, `stats`); logout invalidates the refresh session before the simulated latency.
- **Docs:** 🧪 Testing Strategy, 🚀 Setup, definition of done = `verify:all`, procedure step 10 includes an e2e spec per feature.
- Verified: `tsc -b` (app, node, e2e), ESLint clean, e2e 17/17 passed (`test-results/.last-run.json`).

### 2026-10-17 — Version control
- **Initialised** the git repository (`main`) and committed the validated template as `ecc20ea` (99 files; `node_modules`/`dist`/local env files excluded by `.gitignore`).
- **Added** the 🌿 Version Control section (commit policy, message format, what is committed, secret handling, remote-agent and Windows notes).
- Step 3 marked validated by the owner (full browser checklist passed).

### 2026-10-17 — Step 3: Employees feature (reference implementation)
- **Added** `features/employees/*` (types, URL schema, service, form, columns, delete action) and routes `_authenticated/employees.tsx`, `employees/index.tsx`, `employees/new.tsx`, `employees/$employeeId.tsx`.
- **Added** UI primitives `components/ui/NativeSelect.tsx`, `components/ui/Badge.tsx`.
- **Generic changes (backward compatible):**
  - `hooks/useTableSearchNavigation` is now generic (`<TSearch extends TableSearch>`) so features can patch their own filters with type safety.
  - `types/router-meta.ts` `BreadcrumbResolver.params` widened to `Record<string, unknown>` (routes may parse params, e.g. numeric ids).
  - "Home" breadcrumb moved from the home route to the `_authenticated` layout so it heads every trail.
- **Added** the 🧭 Feature Development Procedure and this Change Log.
- Verified: route generation, `tsc -b`, ESLint (0 errors / 0 warnings); browser checklist (7 behaviours, all mock users) passed — validated by the owner.

### 2026-10-17 — Dev mock backend (MSW 3)
- **Added** `src/mocks/` (worker, seeded DB, response helpers, auth + employees handlers) and `VITE_ENABLE_MOCKS` (optional, dev only, dynamic import → excluded from production).
- MSW installed as `msw@3.0.3` (`npm install -D msw`, `npx msw init public --save` → `public/mockServiceWorker.js`). v3 renamed `onUnhandledRequest` → `onUnhandledFrame`.
- `eslint.config.js`: ignore generated `public/mockServiceWorker.js`.
- `lib/apiError.ts`: user-friendly network/timeout messages (raw Axios message kept in `cause`).

### 2026-10-17 — Step 2 validation fixes
- **TanStack Table 9** (installed by `"latest"`): migrated `GenericDataTable` to `useTable` + explicit `tableFeatures` (`lib/dataTable.ts`), `table.FlexRender`, `DataTableColumn<TData>` (dropped the `TValue` generic from the component props).
- `GenericErrorBoundary`: router `error` is `unknown` → normalised to `Error`.
- Removed two unnecessary type assertions flagged by ESLint (`DynamicBreadcrumbs`, `lib/router.ts`).
- `vite.config.ts`: import `env.schema.ts` with its extension (Vite native config loader).
- Production builds require `.env.production` (or `.env.production.local`); missing values fail the build by design.

### 2026-10-17 — Step 1 & 2: initial generic core
- Project scaffold (Vite 8, React 19, TypeScript 6, Tailwind 4, ESLint 10 flat config, TanStack Router/Query/Table, Zustand, RHF + Zod 4, Axios, SignalR, Vitest), generic layers, auth feature, unit tests for pure modules.
- TypeScript pinned to 6.x (TypeScript 7 not yet supported by typescript-eslint).
