import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/Button';
import { RoleForm } from '@/features/access/roles/forms/RoleForm';
import { emptyRoleForm, toRoleInput } from '@/features/access/roles/forms/roleFormSchema';
import { roleMutationOptions, roleService } from '@/features/access/roles/services/roleService';
import { ROLE_PERMISSIONS } from '@/features/access/roles/types/role';
import { requirePermissions } from '@/features/auth/guards';
import { useCreateEntity } from '@/hooks/useEntityMutations';

export const Route = createFileRoute('/_authenticated/roles/new')({
  staticData: { breadcrumb: 'New role', persistSearch: false },
  beforeLoad: requirePermissions([ROLE_PERMISSIONS.write]),
  component: NewRolePage,
});

function NewRolePage() {
  const navigate = Route.useNavigate();
  const createMutation = useCreateEntity(roleService, roleMutationOptions);

  return (
    <section className="grid max-w-3xl gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">New role</h1>
      <div className="rounded-lg border bg-card p-6">
        <RoleForm
          defaultValues={emptyRoleForm}
          submitLabel="Create role"
          onSubmit={async (values) => {
            const created = await createMutation.mutateAsync(toRoleInput(values));
            await navigate({ to: '/roles/$roleId', params: { roleId: created.id } });
          }}
          actions={
            <Button variant="ghost" asChild>
              <Link to="/roles">Cancel</Link>
            </Button>
          }
        />
      </div>
    </section>
  );
}
