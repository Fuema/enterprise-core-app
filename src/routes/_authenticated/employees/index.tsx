import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, stripSearchParams, useLocation } from '@tanstack/react-router';
import { Plus, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { GenericActionGuard } from '@/components/shared/GenericActionGuard';
import { GenericDataTable } from '@/components/shared/GenericDataTable';
import { LookupSelect } from '@/components/shared/LookupSelect';
import { Button } from '@/components/ui/Button';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { BulkDeleteEmployeesButton } from '@/features/employees/components/BulkDeleteEmployeesButton';
import { employeeColumns } from '@/features/employees/components/employeeColumns';
import { employeeQueries, locationQueries } from '@/features/employees/services/employeeService';
import { EMPLOYEE_GENDERS, EMPLOYEE_PERMISSIONS, type Employee } from '@/features/employees/types/employee';
import {
  employeeSearchDefaults,
  employeeSearchSchema,
  toEmployeeFilter,
  type EmployeeSearch,
} from '@/features/employees/types/employeeSearch';
import { useTableSearchNavigation } from '@/hooks/useTableSearchNavigation';
import { searchMemory } from '@/lib/searchMemory';
import { parseSelected } from '@/lib/tableSearch';

/** Stable empty fallback: a new `[]` per render would invalidate the table's row model. */
const EMPTY_ROWS: Employee[] = [];

export const Route = createFileRoute('/_authenticated/employees/')({
  validateSearch: employeeSearchSchema,
  // Keep defaults out of the URL: clean links, and an empty URL triggers search-memory restore.
  search: { middlewares: [stripSearchParams(employeeSearchDefaults)] },
  // The loader re-runs only when the filter changes; data is cached by TanStack Query.
  loaderDeps: ({ search }) => ({ filter: toEmployeeFilter(search) }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(employeeQueries.list(deps.filter)),
  component: EmployeesPage,
});

function EmployeesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { pathname } = useLocation();
  const onSearchChange = useTableSearchNavigation<EmployeeSearch>();

  const filter = useMemo(() => toEmployeeFilter(search), [search]);
  const query = useQuery({ ...employeeQueries.list(filter), placeholderData: keepPreviousData });
  const countries = useQuery(locationQueries.countries());
  const selectedIds = useMemo(() => parseSelected(search.selected).map(Number).filter(Number.isInteger), [search.selected]);

  const resetView = () => {
    // Explicit reset must also clear the remembered deep link.
    searchMemory.forget(pathname);
    void navigate({ search: {}, replace: true });
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">Server-side paging, sorting and search; state lives in the URL.</p>
        </div>
        <GenericActionGuard permissions={[EMPLOYEE_PERMISSIONS.write]}>
          <Button asChild>
            <Link to="/employees/new">
              <Plus />
              New employee
            </Link>
          </Button>
        </GenericActionGuard>
      </div>

      <GenericDataTable
        data={query.data?.data ?? EMPTY_ROWS}
        columns={employeeColumns}
        totalCount={query.data?.totalCount ?? 0}
        search={search}
        onSearchChange={onSearchChange}
        getRowId={(employee) => String(employee.id)}
        enableRowSelection
        isLoading={query.isPending}
        isFetching={query.isFetching}
        searchPlaceholder="Search name, email, city…"
        onRowClick={(employee) => void navigate({ to: '/employees/$employeeId', params: { employeeId: employee.id } })}
        toolbar={
          <div className="flex items-center gap-2">
            <BulkDeleteEmployeesButton ids={selectedIds} onDeleted={() => onSearchChange({ selected: undefined })} />
            <LookupSelect
              aria-label="Filter by country"
              className="h-9 w-44"
              items={countries.data}
              isLoading={countries.isPending}
              value={search.countryId}
              placeholder="All countries"
              onValueChange={(id) => onSearchChange({ countryId: id > 0 ? id : undefined, page: 1 })}
            />
            <NativeSelect
              aria-label="Filter by gender"
              className="h-9 w-36"
              value={search.gender ?? ''}
              onChange={(event) => {
                const gender = EMPLOYEE_GENDERS.find((value) => value === event.target.value);
                onSearchChange({ gender, page: 1 });
              }}
            >
              <option value="">All genders</option>
              {EMPLOYEE_GENDERS.map((gender) => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </NativeSelect>
            <Button variant="outline" onClick={resetView} title="Reset filters, sorting and paging">
              <RotateCcw />
              Reset
            </Button>
          </div>
        }
      />
    </section>
  );
}
