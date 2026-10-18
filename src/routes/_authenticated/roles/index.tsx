import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, stripSearchParams, useLocation } from '@tanstack/react-router';
import { Plus, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { GenericActionGuard } from '@/components/shared/GenericActionGuard';
import { GenericDataTable } from '@/components/shared/GenericDataTable';
import { Button } from '@/components/ui/Button';
import { roleColumns } from '@/features/access/roles/components/roleColumns';
import { roleQueries } from '@/features/access/roles/services/roleService';
import { ROLE_PERMISSIONS, type Role } from '@/features/access/roles/types/role';
import { roleSearchDefaults, roleSearchSchema, toRoleFilter, type RoleSearch } from '@/features/access/roles/types/roleSearch';
import { useTableSearchNavigation } from '@/hooks/useTableSearchNavigation';
import { searchMemory } from '@/lib/searchMemory';

const EMPTY_ROWS: Role[] = [];

export const Route = createFileRoute('/_authenticated/roles/')({
  validateSearch: roleSearchSchema,
  search: { middlewares: [stripSearchParams(roleSearchDefaults)] },
  loaderDeps: ({ search }) => ({ filter: toRoleFilter(search) }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(roleQueries.list(deps.filter)),
  component: RolesPage,
});

function RolesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { pathname } = useLocation();
  const onSearchChange = useTableSearchNavigation<RoleSearch>();
  const filter = useMemo(() => toRoleFilter(search), [search]);
  const query = useQuery({ ...roleQueries.list(filter), placeholderData: keepPreviousData });

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
          <p className="text-sm text-muted-foreground">
            Named sets of permissions. A user's access is the union of their roles plus any extra permissions.
          </p>
        </div>
        <GenericActionGuard permissions={[ROLE_PERMISSIONS.write]}>
          <Button asChild>
            <Link to="/roles/new">
              <Plus />
              New role
            </Link>
          </Button>
        </GenericActionGuard>
      </div>

      <GenericDataTable
        data={query.data?.data ?? EMPTY_ROWS}
        columns={roleColumns}
        totalCount={query.data?.totalCount ?? 0}
        search={search}
        onSearchChange={onSearchChange}
        getRowId={(row) => String(row.id)}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        searchPlaceholder="Search roles…"
        onRowClick={(row) => void navigate({ to: '/roles/$roleId', params: { roleId: row.id } })}
        toolbar={
          <Button
            variant="outline"
            onClick={() => {
              searchMemory.forget(pathname);
              void navigate({ search: {}, replace: true });
            }}
            title="Reset sorting and paging"
          >
            <RotateCcw />
            Reset
          </Button>
        }
      />
    </section>
  );
}
