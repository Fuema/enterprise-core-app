import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute, stripSearchParams, useLocation } from '@tanstack/react-router';
import { RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { GenericDataTable } from '@/components/shared/GenericDataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { auditColumns } from '@/features/access/audit/components/auditColumns';
import { auditQueries } from '@/features/access/audit/services/auditService';
import { AUDIT_TARGET_TYPES, auditActionLabel, type AuditEntry } from '@/features/access/audit/types/audit';
import { auditSearchDefaults, auditSearchSchema, toAuditFilter, type AuditSearch } from '@/features/access/audit/types/auditSearch';
import { useTableSearchNavigation } from '@/hooks/useTableSearchNavigation';
import { searchMemory } from '@/lib/searchMemory';

const EMPTY_ROWS: AuditEntry[] = [];

export const Route = createFileRoute('/_authenticated/audit/')({
  validateSearch: auditSearchSchema,
  search: { middlewares: [stripSearchParams(auditSearchDefaults)] },
  loaderDeps: ({ search }) => ({ filter: toAuditFilter(search) }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(auditQueries.list(deps.filter)),
  component: AuditPage,
});

function AuditPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { pathname } = useLocation();
  const onSearchChange = useTableSearchNavigation<AuditSearch>();
  const filter = useMemo(() => toAuditFilter(search), [search]);
  const query = useQuery({ ...auditQueries.list(filter), placeholderData: keepPreviousData });
  const actions = useQuery(auditQueries.actions());

  return (
    <section className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Sign-ins, account and role changes. Entries are written with each change and cannot be edited.
        </p>
      </div>

      <GenericDataTable
        data={query.data?.data ?? EMPTY_ROWS}
        columns={auditColumns}
        totalCount={query.data?.totalCount ?? 0}
        search={search}
        onSearchChange={onSearchChange}
        getRowId={(row) => String(row.id)}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        searchPlaceholder="Search person, target, IP…"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect
              aria-label="Filter by action"
              className="h-9 w-48"
              value={search.action ?? ''}
              onChange={(event) => onSearchChange({ action: event.target.value || undefined, page: 1 })}
            >
              <option value="">All actions</option>
              {(actions.data ?? []).map((action) => (
                <option key={action} value={action}>
                  {auditActionLabel(action)}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label="Filter by target"
              className="h-9 w-32"
              value={search.targetType ?? ''}
              onChange={(event) => {
                const targetType = AUDIT_TARGET_TYPES.find((value) => value === event.target.value);
                onSearchChange({ targetType, page: 1 });
              }}
            >
              <option value="">All targets</option>
              <option value="user">Users</option>
              <option value="role">Roles</option>
            </NativeSelect>
            <Input
              type="date"
              aria-label="From date"
              className="h-9 w-40"
              value={search.from ?? ''}
              onChange={(event) => onSearchChange({ from: event.target.value || undefined, page: 1 })}
            />
            <Input
              type="date"
              aria-label="To date"
              className="h-9 w-40"
              value={search.to ?? ''}
              onChange={(event) => onSearchChange({ to: event.target.value || undefined, page: 1 })}
            />
            <Button
              variant="outline"
              onClick={() => {
                searchMemory.forget(pathname);
                void navigate({ search: {}, replace: true });
              }}
              title="Reset filters, sorting and paging"
            >
              <RotateCcw />
              Reset
            </Button>
          </div>
        }
      />
    </section>
  );
}
