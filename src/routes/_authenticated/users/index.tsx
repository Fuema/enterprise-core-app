import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, stripSearchParams, useLocation } from '@tanstack/react-router';
import { Plus, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { GenericActionGuard } from '@/components/shared/GenericActionGuard';
import { GenericDataTable } from '@/components/shared/GenericDataTable';
import { Button } from '@/components/ui/Button';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { accessLookups } from '@/features/access/shared/accessLookups';
import { userColumns } from '@/features/access/users/components/userColumns';
import { userQueries } from '@/features/access/users/services/userService';
import { USER_PERMISSIONS, type User } from '@/features/access/users/types/user';
import {
  USER_STATUS_FILTERS,
  toUserFilter,
  userSearchDefaults,
  userSearchSchema,
  type UserSearch,
} from '@/features/access/users/types/userSearch';
import { useTableSearchNavigation } from '@/hooks/useTableSearchNavigation';
import { searchMemory } from '@/lib/searchMemory';

const EMPTY_ROWS: User[] = [];

export const Route = createFileRoute('/_authenticated/users/')({
  validateSearch: userSearchSchema,
  search: { middlewares: [stripSearchParams(userSearchDefaults)] },
  loaderDeps: ({ search }) => ({ filter: toUserFilter(search) }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(userQueries.list(deps.filter)),
  component: UsersPage,
});

function UsersPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { pathname } = useLocation();
  const onSearchChange = useTableSearchNavigation<UserSearch>();

  const filter = useMemo(() => toUserFilter(search), [search]);
  const query = useQuery({ ...userQueries.list(filter), placeholderData: keepPreviousData });
  const roles = useQuery(accessLookups.roleOptions());

  const resetView = () => {
    searchMemory.forget(pathname);
    void navigate({ search: {}, replace: true });
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">Accounts, their roles and extra permissions.</p>
        </div>
        <GenericActionGuard permissions={[USER_PERMISSIONS.write]}>
          <Button asChild>
            <Link to="/users/new">
              <Plus />
              New user
            </Link>
          </Button>
        </GenericActionGuard>
      </div>

      <GenericDataTable
        data={query.data?.data ?? EMPTY_ROWS}
        columns={userColumns}
        totalCount={query.data?.totalCount ?? 0}
        search={search}
        onSearchChange={onSearchChange}
        getRowId={(row) => String(row.id)}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        searchPlaceholder="Search username, name, email, role…"
        onRowClick={(row) => void navigate({ to: '/users/$userId', params: { userId: row.id } })}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect
              aria-label="Filter by role"
              className="h-9 w-44"
              value={search.roleId === undefined ? '' : String(search.roleId)}
              onChange={(event) => {
                const roleId = Number(event.target.value);
                onSearchChange({ roleId: roleId > 0 ? roleId : undefined, page: 1 });
              }}
            >
              <option value="">All roles</option>
              {(roles.data ?? []).map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label="Filter by status"
              className="h-9 w-36"
              value={search.status ?? ''}
              onChange={(event) => {
                const status = USER_STATUS_FILTERS.find((value) => value === event.target.value);
                onSearchChange({ status, page: 1 });
              }}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
