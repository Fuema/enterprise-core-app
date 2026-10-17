import { createFileRoute, Link, Outlet, useNavigate } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { FEATURES } from '@/app/featureRegistry';
import { DynamicBreadcrumbs } from '@/components/shared/DynamicBreadcrumbs';
import { GenericActionGuard } from '@/components/shared/GenericActionGuard';
import { Button } from '@/components/ui/Button';
import { useAuthStore, useLogout } from '@/features/auth';
import { requireAuthentication } from '@/features/auth/guards';
import { env } from '@/lib/env';

/**
 * Protected layout group. Every route under `routes/_authenticated/` requires
 * a session; the check runs in `beforeLoad` against the Zustand auth store,
 * before any child loader executes.
 */
export const Route = createFileRoute('/_authenticated')({
  // First crumb of every protected page: Home / <feature> / <item>
  staticData: { breadcrumb: 'Home' },
  beforeLoad: requireAuthentication,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogout();
  const navigate = useNavigate();

  const signOut = async () => {
    await logoutMutation.mutateAsync();
    await navigate({ to: '/login', search: {} });
  };

  return (
    <div className="min-h-dvh">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-1" aria-label="Main">
            <Link to="/" className="font-semibold tracking-tight">
              {env.VITE_APP_NAME}
            </Link>
            {/* Feature navigation: generated from the registry, one guarded link per feature. */}
            {FEATURES.map((feature) => (
              <GenericActionGuard key={feature.key} permissions={[feature.permissions.read]}>
                <Link
                  to={feature.to}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  activeProps={{ className: 'text-sm font-medium text-foreground' }}
                >
                  {feature.label}
                </Link>
              </GenericActionGuard>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{user?.displayName}</span>
            <Button variant="ghost" size="sm" onClick={() => void signOut()} disabled={logoutMutation.isPending}>
              <LogOut />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-6">
        <DynamicBreadcrumbs />
        <Outlet />
      </main>
    </div>
  );
}
