import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { GenericActionGuard } from '@/components/shared/GenericActionGuard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DeleteEmployeeButton } from '@/features/employees/components/DeleteEmployeeButton';
import { EmployeeForm } from '@/features/employees/forms/EmployeeForm';
import { toEmployeeFormValues } from '@/features/employees/forms/employeeFormSchema';
import { employeeQueries, employeeService } from '@/features/employees/services/employeeService';
import { EMPLOYEE_PERMISSIONS, employeeFullName, employeeSchema } from '@/features/employees/types/employee';
import { useUpdateEntity } from '@/hooks/useEntityMutations';
import { ApiError } from '@/lib/apiError';

export const Route = createFileRoute('/_authenticated/employees/$employeeId')({
  // Typed params: the URL segment is a string, the app works with a number.
  params: {
    parse: ({ employeeId }) => ({ employeeId: Number(employeeId) }),
    stringify: ({ employeeId }) => ({ employeeId: String(employeeId) }),
  },
  loader: async ({ context, params }) => {
    if (!Number.isInteger(params.employeeId) || params.employeeId <= 0) throw notFound();
    try {
      return await context.queryClient.ensureQueryData(employeeQueries.detail(params.employeeId));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  staticData: {
    // Loader data is `unknown` to the generic breadcrumb component: validate before use.
    breadcrumb: ({ loaderData }) => {
      const parsed = employeeSchema.safeParse(loaderData);
      return parsed.success ? employeeFullName(parsed.data) : 'Employee';
    },
    persistSearch: false,
  },
  notFoundComponent: EmployeeNotFound,
  component: EmployeeDetailPage,
});

function EmployeeDetailPage() {
  const { employeeId } = Route.useParams();
  const navigate = Route.useNavigate();
  // Already in cache from the loader; stays reactive to updates (mutations, hub events).
  const { data: employee } = useSuspenseQuery(employeeQueries.detail(employeeId));
  const updateMutation = useUpdateEntity(employeeService);

  const readOnly = (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {(
        [
          ['Email', employee.email],
          ['Department', employee.department],
          ['Job title', employee.jobTitle],
          ['Hire date', employee.hireDate],
        ] as const
      ).map(([label, value]) => (
        <div key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <section className="grid max-w-2xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{employeeFullName(employee)}</h1>
          {employee.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>}
        </div>
        <Button variant="ghost" asChild>
          {/* No search params on purpose: the router restores the list's last page/sort/filter. */}
          <Link to="/employees">
            <ArrowLeft />
            Back to list
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <GenericActionGuard permissions={[EMPLOYEE_PERMISSIONS.write]} fallback={readOnly}>
          <EmployeeForm
            key={employee.id}
            defaultValues={toEmployeeFormValues(employee)}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              await updateMutation.mutateAsync({ id: employee.id, payload: values });
            }}
            actions={
              <>
                {updateMutation.isSuccess && <span className="text-sm text-muted-foreground">Saved.</span>}
                <span className="ml-auto">
                  <DeleteEmployeeButton
                    employee={employee}
                    size="default"
                    onDeleted={() => void navigate({ to: '/employees' })}
                  />
                </span>
              </>
            }
          />
        </GenericActionGuard>
      </div>
    </section>
  );
}

function EmployeeNotFound() {
  return (
    <div className="grid max-w-md gap-3">
      <h1 className="text-xl font-semibold">Employee not found</h1>
      <p className="text-muted-foreground">It may have been deleted, or the link is wrong.</p>
      <div>
        <Button variant="outline" asChild>
          <Link to="/employees">Back to employees</Link>
        </Button>
      </div>
    </div>
  );
}
