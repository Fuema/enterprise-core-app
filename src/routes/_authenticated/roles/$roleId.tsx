import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { GenericActionGuard } from '@/components/shared/GenericActionGuard';
import { GenericDeleteButton } from '@/components/shared/GenericDeleteButton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { permissionSummary } from '@/features/access/roles/components/roleColumns';
import { RoleForm } from '@/features/access/roles/forms/RoleForm';
import { toRoleFormValues, toRoleInput } from '@/features/access/roles/forms/roleFormSchema';
import { roleMutationOptions, roleQueries, roleService } from '@/features/access/roles/services/roleService';
import { ROLE_PERMISSIONS, roleSchema } from '@/features/access/roles/types/role';
import { USER_PERMISSIONS } from '@/features/access/users/types/user';
import { useUpdateEntity } from '@/hooks/useEntityMutations';
import { ApiError } from '@/lib/apiError';
import { usePermissions } from '@/features/auth';

export const Route = createFileRoute('/_authenticated/roles/$roleId')({
  params: {
    parse: ({ roleId }) => ({ roleId: Number(roleId) }),
    stringify: ({ roleId }) => ({ roleId: String(roleId) }),
  },
  loader: async ({ context, params }) => {
    if (!Number.isInteger(params.roleId) || params.roleId <= 0) throw notFound();
    try {
      return await context.queryClient.ensureQueryData(roleQueries.detail(params.roleId));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  staticData: {
    breadcrumb: ({ loaderData }) => {
      const parsed = roleSchema.safeParse(loaderData);
      return parsed.success ? parsed.data.name : 'Role';
    },
    persistSearch: false,
  },
  notFoundComponent: RoleNotFound,
  component: RoleDetailPage,
});

function RoleDetailPage() {
  const { roleId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { data: role } = useSuspenseQuery(roleQueries.detail(roleId));
  const updateMutation = useUpdateEntity(roleService, roleMutationOptions);
  const canOpenUsers = usePermissions([USER_PERMISSIONS.read]);

  return (
    <section className="grid max-w-3xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{role.name}</h1>
          {role.isSystem && <Badge variant="muted">System</Badge>}
        </div>
        <Button variant="ghost" asChild>
          <Link to="/roles">
            <ArrowLeft />
            Back to list
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 rounded-lg border bg-card p-6">
        <GenericActionGuard
          permissions={[ROLE_PERMISSIONS.write]}
          fallback={
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Description</dt>
                <dd className="font-medium">{role.description ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Permissions</dt>
                <dd className="font-medium break-words">{permissionSummary(role.permissions)}</dd>
              </div>
            </dl>
          }
        >
          <RoleForm
            key={`${String(role.id)}-${role.permissions.join(',')}`}
            defaultValues={toRoleFormValues(role)}
            isSystem={role.isSystem}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              await updateMutation.mutateAsync({ id: role.id, payload: toRoleInput(values) });
            }}
            actions={updateMutation.isSuccess && <span className="text-sm text-muted-foreground">Saved.</span>}
          />
        </GenericActionGuard>
        {!role.isSystem && (
          <div className="flex justify-end">
            <GenericDeleteButton
              service={roleService}
              entity={role}
              label={role.name}
              size="default"
              permissions={[ROLE_PERMISSIONS.delete]}
              mutationOptions={roleMutationOptions}
              onDeleted={() => void navigate({ to: '/roles' })}
            />
          </div>
        )}
      </div>

      <div className="grid gap-3 rounded-lg border bg-card p-6">
        <h2 className="font-medium">
          Members <span className="text-sm font-normal text-muted-foreground">({role.userCount})</span>
        </h2>
        {role.members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No user has this role.</p>
        ) : (
          <ul className="grid gap-1 text-sm" aria-label="Members">
            {role.members.map((member) => (
              <li key={member.id} className="flex items-center gap-2">
                {canOpenUsers ? (
                  <Link to="/users/$userId" params={{ userId: member.id }} className="font-medium underline-offset-4 hover:underline">
                    {member.username}
                  </Link>
                ) : (
                  <span className="font-medium">{member.username}</span>
                )}
                <span className="text-muted-foreground">{member.displayName}</span>
                {!member.isActive && <Badge variant="muted">Inactive</Badge>}
              </li>
            ))}
          </ul>
        )}
        {role.userCount > role.members.length && (
          <p className="text-xs text-muted-foreground">Showing the first {role.members.length} members.</p>
        )}
      </div>
    </section>
  );
}

function RoleNotFound() {
  return (
    <div className="grid max-w-md gap-3">
      <h1 className="text-xl font-semibold">Role not found</h1>
      <div>
        <Button variant="outline" asChild>
          <Link to="/roles">Back to roles</Link>
        </Button>
      </div>
    </div>
  );
}
