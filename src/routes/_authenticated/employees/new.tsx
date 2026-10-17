import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/Button';
import { requirePermissions } from '@/features/auth/guards';
import { EmployeeForm } from '@/features/employees/forms/EmployeeForm';
import { emptyEmployeeForm } from '@/features/employees/forms/employeeFormSchema';
import { employeeService } from '@/features/employees/services/employeeService';
import { EMPLOYEE_PERMISSIONS } from '@/features/employees/types/employee';
import { useCreateEntity } from '@/hooks/useEntityMutations';

export const Route = createFileRoute('/_authenticated/employees/new')({
  staticData: { breadcrumb: 'New employee', persistSearch: false },
  beforeLoad: requirePermissions([EMPLOYEE_PERMISSIONS.write]),
  component: NewEmployeePage,
});

function NewEmployeePage() {
  const navigate = Route.useNavigate();
  const createMutation = useCreateEntity(employeeService);

  return (
    <section className="grid max-w-2xl gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">New employee</h1>
      <div className="rounded-lg border bg-card p-6">
        <EmployeeForm
          defaultValues={emptyEmployeeForm}
          submitLabel="Create employee"
          onSubmit={async (values) => {
            // An ApiError (e.g. duplicate email) propagates to the form and is mapped onto the field.
            const created = await createMutation.mutateAsync(values);
            await navigate({ to: '/employees/$employeeId', params: { employeeId: created.id } });
          }}
          actions={
            <Button variant="ghost" asChild>
              <Link to="/employees">Cancel</Link>
            </Button>
          }
        />
      </div>
    </section>
  );
}
