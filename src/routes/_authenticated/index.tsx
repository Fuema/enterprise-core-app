import { createFileRoute, Link } from '@tanstack/react-router';
import { Check, Minus } from 'lucide-react';
import { FEATURES, type FeatureEntry } from '@/app/featureRegistry';
import { GenericActionGuard } from '@/components/shared/GenericActionGuard';
import { useAuthStore } from '@/features/auth';
import { hasPermissions } from '@/lib/permissions';

// Breadcrumb 'Home' is declared on the _authenticated layout (first crumb of every page).
export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
});

const ACTIONS = ['read', 'write', 'delete'] as const;
const ACTION_LABEL = { read: 'View', write: 'Create / edit', delete: 'Delete' } as const;

/** Dashboard: one card per feature the user may read + what they may do in each feature. */
function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const granted = user?.permissions ?? [];
  const visible = FEATURES.filter((feature) => hasPermissions(granted, [feature.permissions.read]));

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome{user ? `, ${user.displayName}` : ''}</h1>
        <p className="text-muted-foreground">
          {visible.length > 0
            ? 'Pick a feature to get started.'
            : 'Your account has no feature access yet. Ask an administrator to grant permissions.'}
        </p>
      </div>

      {visible.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <GenericActionGuard key={feature.key} permissions={[feature.permissions.read]}>
              <FeatureCard feature={feature} />
            </GenericActionGuard>
          ))}
        </div>
      )}

      <div className="grid gap-3 rounded-lg border bg-card p-4">
        <h2 className="font-medium">Your access</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Your access">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1.5 pr-4 font-medium">Feature</th>
                {ACTIONS.map((action) => (
                  <th key={action} className="px-2 py-1.5 text-center font-medium">
                    {ACTION_LABEL[action]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((feature) => (
                <tr key={feature.key} className="border-t">
                  <th scope="row" className="py-1.5 pr-4 text-left font-medium">
                    {feature.label}
                  </th>
                  {ACTIONS.map((action) => {
                    const allowed = hasPermissions(granted, [feature.permissions[action]]);
                    return (
                      <td
                        key={action}
                        className="px-2 py-1.5 text-center"
                        aria-label={`${feature.label} ${ACTION_LABEL[action]}: ${allowed ? 'allowed' : 'not allowed'}`}
                      >
                        {allowed ? (
                          <Check className="mx-auto size-4 text-emerald-600" aria-hidden />
                        ) : (
                          <Minus className="mx-auto size-4 text-muted-foreground/50" aria-hidden />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2">
          {granted.length === 0 ? (
            <span className="text-sm text-muted-foreground">No permissions granted.</span>
          ) : (
            granted.map((permission) => (
              <code key={permission} className="rounded bg-muted px-2 py-0.5 text-xs">
                {permission}
              </code>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: FeatureEntry }) {
  const count = feature.useCount();
  const Icon = feature.icon;
  return (
    <Link
      to={feature.to}
      className="grid gap-2 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
      aria-label={`${feature.label}: ${count === undefined ? 'loading' : String(count)} records`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-medium">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {feature.label}
        </span>
        <span className="text-2xl font-semibold tabular-nums">{count ?? '…'}</span>
      </div>
      <span className="text-sm text-muted-foreground">{feature.description}</span>
    </Link>
  );
}
