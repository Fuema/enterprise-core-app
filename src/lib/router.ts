import { createRouter } from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';
import { env } from './env';
import { queryClient } from './queryClient';
import { searchMemory } from './searchMemory';
import { resolveBasepath } from './tenant';

/**
 * File-based TanStack Router. Routes live in `src/routes/` and the tree is
 * generated into `src/routeTree.gen.ts` by the Vite plugin / `tsr generate`.
 */
export const router = createRouter({
  routeTree,
  // Path-based tenancy: https://host/acme/... -> every route is served under "/acme".
  basepath: resolveBasepath(
    { strategy: env.VITE_TENANT_STRATEGY, rootDomain: env.VITE_TENANT_ROOT_DOMAIN },
    window.location,
  ),
  context: { queryClient },
  defaultPreload: 'intent',
  // TanStack Query owns freshness; the router should always ask it.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

// Search-state memory: record the last search params of every resolved route.
// Restoration happens in the root route's `beforeLoad` (see routes/__root.tsx).
router.subscribe('onResolved', ({ toLocation }) => {
  const leaf = router.state.matches.at(-1);
  if (leaf?.staticData.persistSearch === false) return;
  searchMemory.remember(toLocation.pathname, toLocation.search);
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
