import { createFileRoute, Link } from '@tanstack/react-router';
import { GenericActionGuard } from '@/components/shared/GenericActionGuard';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/features/auth';

// Breadcrumb 'Home' is declared on the _authenticated layout (first crumb of every page).
export const Route = createFileRoute('/_authenticated/')({
  component: HomePage,
});

/** Landing page: entry points to the features the user may access. */
function HomePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome{user ? `, ${user.displayName}` : ''}</h1>
        <p className="text-muted-foreground">The generic core is running. Add features under src/features.</p>
      </div>

      <GenericActionGuard permissions={['employees:read']}>
        <Link
          to="/employees"
          className="grid max-w-sm gap-1 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
        >
          <span className="font-medium">Employees</span>
          <span className="text-sm text-muted-foreground">Browse, search and manage employee records.</span>
        </Link>
      </GenericActionGuard>

      <div className="grid gap-3 rounded-lg border bg-card p-4">
        <h2 className="font-medium">Your access scopes</h2>
        <div className="flex flex-wrap gap-2">
          {(user?.permissions ?? []).length === 0 ? (
            <span className="text-sm text-muted-foreground">No permissions granted.</span>
          ) : (
            user?.permissions.map((permission) => (
              <code key={permission} className="rounded bg-muted px-2 py-0.5 text-xs">
                {permission}
              </code>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <GenericActionGuard
            permissions={['admin:*']}
            fallback={
              <Button variant="outline" disabled title="Requires admin:*">
                Admin action
              </Button>
            }
          >
            <Button>Admin action</Button>
          </GenericActionGuard>
        </div>
      </div>
    </section>
  );
}
