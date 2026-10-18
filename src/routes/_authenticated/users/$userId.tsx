import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { GenericActionGuard } from '@/components/shared/GenericActionGuard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { UserSecurityPanel } from '@/features/access/users/components/UserSecurityPanel';
import { UserForm } from '@/features/access/users/forms/UserForm';
import { toUserFormValues, toUserUpdate } from '@/features/access/users/forms/userFormSchema';
import { userQueries, userService } from '@/features/access/users/services/userService';
import { isLockedOut, USER_PERMISSIONS, userSchema } from '@/features/access/users/types/user';
import { accessLookups } from '@/features/access/shared/accessLookups';
import { useAuthStore } from '@/features/auth';
import { useUpdateEntity } from '@/hooks/useEntityMutations';
import { ApiError } from '@/lib/apiError';

export const Route = createFileRoute('/_authenticated/users/$userId')({
  params: {
    parse: ({ userId }) => ({ userId: Number(userId) }),
    stringify: ({ userId }) => ({ userId: String(userId) }),
  },
  loader: async ({ context, params }) => {
    if (!Number.isInteger(params.userId) || params.userId <= 0) throw notFound();
    try {
      return await context.queryClient.ensureQueryData(userQueries.detail(params.userId));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  staticData: {
    breadcrumb: ({ loaderData }) => {
      const parsed = userSchema.safeParse(loaderData);
      return parsed.success ? parsed.data.username : 'User';
    },
    persistSearch: false,
  },
  notFoundComponent: UserNotFound,
  component: UserDetailPage,
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const { data: user } = useSuspenseQuery(userQueries.detail(userId));
  // Role memberships change role member counts and the role options.
  const updateMutation = useUpdateEntity(userService, { invalidate: [accessLookups.all, ['/roles']] });
  const isSelf = useAuthStore((state) => state.user?.id === String(user.id));

  const readOnly = (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {(
        [
          ['Full name', user.displayName],
          ['Email', user.email ?? '—'],
          ['Roles', user.roles.map((role) => role.name).join(', ') || 'No roles'],
          ['Extra permissions', user.directPermissions.join(', ') || 'None'],
          ['Effective permissions', user.effectivePermissions.join(', ') || 'No access'],
        ] as const
      ).map(([label, value]) => (
        <div key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <section className="grid max-w-3xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{user.username}</h1>
          {user.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>}
          {isLockedOut(user) && <Badge variant="destructive">Locked</Badge>}
          {user.mustChangePassword && <Badge variant="warning">Must change password</Badge>}
          {isSelf && <Badge variant="muted">You</Badge>}
        </div>
        <Button variant="ghost" asChild>
          <Link to="/users">
            <ArrowLeft />
            Back to list
          </Link>
        </Button>
      </div>

      {isSelf && (
        <p className="text-sm text-muted-foreground">
          This is your account: you cannot deactivate it, remove your own <code>users:write</code> or reset your own
          password here (use <Link to="/account" className="underline">My account</Link>).
        </p>
      )}

      <div className="rounded-lg border bg-card p-6">
        <GenericActionGuard permissions={[USER_PERMISSIONS.write]} fallback={readOnly}>
          <UserForm
            key={`${String(user.id)}-${user.roles.map((role) => role.id).join(',')}-${user.directPermissions.join(',')}`}
            defaultValues={toUserFormValues(user)}
            onSubmit={async (values) => {
              await updateMutation.mutateAsync({ id: user.id, payload: toUserUpdate(values) });
            }}
            actions={updateMutation.isSuccess && <span className="text-sm text-muted-foreground">Saved.</span>}
          />
        </GenericActionGuard>
        {user.effectivePermissions.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            Effective permissions: <code>{user.effectivePermissions.join(', ')}</code>
          </p>
        )}
      </div>

      <div className="grid gap-3 rounded-lg border bg-card p-6">
        <h2 className="font-medium">Security</h2>
        <UserSecurityPanel user={user} isSelf={isSelf} />
      </div>
    </section>
  );
}

function UserNotFound() {
  return (
    <div className="grid max-w-md gap-3">
      <h1 className="text-xl font-semibold">User not found</h1>
      <div>
        <Button variant="outline" asChild>
          <Link to="/users">Back to users</Link>
        </Button>
      </div>
    </div>
  );
}
