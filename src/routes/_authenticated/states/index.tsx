import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, stripSearchParams, useLocation } from '@tanstack/react-router';
import { Plus, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { GenericActionGuard } from '@/components/shared/GenericActionGuard';
import { GenericDataTable } from '@/components/shared/GenericDataTable';
import { LookupSelect } from '@/components/shared/LookupSelect';
import { locationLookups } from '@/features/locations/lookups';
import { Button } from '@/components/ui/Button';
import { stateColumns } from '@/features/locations/states/components/stateColumns';
import { stateQueries } from '@/features/locations/states/services/stateService';
import { STATE_PERMISSIONS, type State } from '@/features/locations/states/types/state';
import { stateSearchDefaults, stateSearchSchema, toStateFilter, type StateSearch } from '@/features/locations/states/types/stateSearch';
import { useTableSearchNavigation } from '@/hooks/useTableSearchNavigation';
import { searchMemory } from '@/lib/searchMemory';

const EMPTY_ROWS: State[] = [];

export const Route = createFileRoute('/_authenticated/states/')({
  validateSearch: stateSearchSchema,
  search: { middlewares: [stripSearchParams(stateSearchDefaults)] },
  loaderDeps: ({ search }) => ({ filter: toStateFilter(search) }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(stateQueries.list(deps.filter)),
  component: StatesPage,
});

function StatesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { pathname } = useLocation();
  const onSearchChange = useTableSearchNavigation<StateSearch>();

  const filter = useMemo(() => toStateFilter(search), [search]);
  const query = useQuery({ ...stateQueries.list(filter), placeholderData: keepPreviousData });
  const countries = useQuery(locationLookups.countries());

  const resetView = () => {
    searchMemory.forget(pathname);
    void navigate({ search: {}, replace: true });
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">States</h1>
          <p className="text-sm text-muted-foreground">States (provinces) grouped by country.</p>
        </div>
        <GenericActionGuard permissions={[STATE_PERMISSIONS.write]}>
          <Button asChild>
            <Link to="/states/new">
              <Plus />
              New state
            </Link>
          </Button>
        </GenericActionGuard>
      </div>

      <GenericDataTable
        data={query.data?.data ?? EMPTY_ROWS}
        columns={stateColumns}
        totalCount={query.data?.totalCount ?? 0}
        search={search}
        onSearchChange={onSearchChange}
        getRowId={(row) => String(row.id)}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        searchPlaceholder="Search states or countries…"
        onRowClick={(row) => void navigate({ to: '/states/$stateId', params: { stateId: row.id } })}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <LookupSelect
              aria-label="Filter by country"
              className="h-9 w-44"
              items={countries.data}
              isLoading={countries.isPending}
              value={search.countryId}
              placeholder="All countries"
              onValueChange={(id) => onSearchChange({ countryId: id > 0 ? id : undefined, page: 1 })}
            />
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
