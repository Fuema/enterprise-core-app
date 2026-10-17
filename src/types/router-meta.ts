import type { QueryClient } from '@tanstack/react-query';

/** Context injected into every route (`beforeLoad`, `loader`). */
export interface RouterContext {
  queryClient: QueryClient;
}

/**
 * Static label, or a function of the matched params / loader data.
 * Params are `unknown` values because routes may parse them (e.g. to numbers).
 */
export type BreadcrumbResolver =
  | string
  | ((match: { params: Record<string, unknown>; loaderData: unknown }) => string);

declare module '@tanstack/react-router' {
  /** Route metadata consumed by the generic layout components. */
  interface StaticDataRouteOption {
    /** Rendered by <DynamicBreadcrumbs />. Routes without it are skipped. */
    breadcrumb?: BreadcrumbResolver;
    /** Remember/restore this route's search params. Default: true. */
    persistSearch?: boolean;
    /** Informational: permissions the route requires (enforce with requirePermissions()). */
    permissions?: readonly string[];
  }
}
