import { createRootRouteWithContext, Link, Outlet, redirect } from '@tanstack/react-router';
import { RouteErrorComponent } from '@/components/shared/GenericErrorBoundary';
import { Button } from '@/components/ui/Button';
import { searchMemory } from '@/lib/searchMemory';
import type { RouterContext } from '@/types/router-meta';

export const Route = createRootRouteWithContext<RouterContext>()({
  /**
   * Layout state recovery: entering a path WITHOUT search params (breadcrumb,
   * menu link, "back to list") restores the last page/sort/filter the user
   * had there. Recording happens in lib/router.ts (onResolved).
   * Same-path navigations never restore: clearing the last filter or the row
   * selection leaves an empty URL on purpose.
   */
  beforeLoad: ({ location }) => {
    if (Object.keys(location.search).length > 0) return;
    const remembered = searchMemory.recallOnEnter(location.pathname);
    if (remembered) {
      // Runtime path + search captured from a previous resolved location.
      throw redirect({ to: location.pathname as '/', search: remembered as never, replace: true });
    }
  },
  component: Outlet,
  errorComponent: RouteErrorComponent,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <div className="mx-auto my-16 grid max-w-md gap-3 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">The page you are looking for does not exist or has moved.</p>
      <div>
        <Button asChild variant="outline">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
