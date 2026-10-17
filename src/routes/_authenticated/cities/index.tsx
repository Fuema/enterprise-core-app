import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, stripSearchParams, useLocation } from '@tanstack/react-router';
import { Plus, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { GenericActionGuard } from '@/components/shared/GenericActionGuard';
import { GenericDataTable } from '@/components/shared/GenericDataTable';
import { LookupSelect } from '@/components/shared/LookupSelect';
import { locationLookups } from '@/features/locations/lookups';
import { Button } from '@/components/ui/Button';
import { cityColumns } from '@/features/locations/cities/components/cityColumns';
import { cityQueries } from '@/features/locations/cities/services/cityService';
import { CITY_PERMISSIONS, type City } from '@/features/locations/cities/types/city';
import { citySearchDefaults, citySearchSchema, toCityFilter, type CitySearch } from '@/features/locations/cities/types/citySearch';
import { useTableSearchNavigation } from '@/hooks/useTableSearchNavigation';
import { searchMemory } from '@/lib/searchMemory';

const EMPTY_ROWS: City[] = [];

export const Route = createFileRoute('/_authenticated/cities/')({
  validateSearch: citySearchSchema,
  search: { middlewares: [stripSearchParams(citySearchDefaults)] },
  loaderDeps: ({ search }) => ({ filter: toCityFilter(search) }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(cityQueries.list(deps.filter)),
  component: CitiesPage,
});

function CitiesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { pathname } = useLocation();
  const onSearchChange = useTableSearchNavigation<CitySearch>();

  const filter = useMemo(() => toCityFilter(search), [search]);
  const query = useQuery({ ...cityQueries.list(filter), placeholderData: keepPreviousData });
  const countries = useQuery(locationLookups.countries());
  const states = useQuery(locationLookups.states(search.countryId));

  const resetView = () => {
    searchMemory.forget(pathname);
    void navigate({ search: {}, replace: true });
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cities</h1>
          <p className="text-sm text-muted-foreground">Cities grouped by state and country.</p>
        </div>
        <GenericActionGuard permissions={[CITY_PERMISSIONS.write]}>
          <Button asChild>
            <Link to="/cities/new">
              <Plus />
              New city
            </Link>
          </Button>
        </GenericActionGuard>
      </div>

      <GenericDataTable
        data={query.data?.data ?? EMPTY_ROWS}
        columns={cityColumns}
        totalCount={query.data?.totalCount ?? 0}
        search={search}
        onSearchChange={onSearchChange}
        getRowId={(row) => String(row.id)}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        searchPlaceholder="Search cities, states or countries…"
        onRowClick={(row) => void navigate({ to: '/cities/$cityId', params: { cityId: row.id } })}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <LookupSelect
              aria-label="Filter by country"
              className="h-9 w-44"
              items={countries.data}
              isLoading={countries.isPending}
              value={search.countryId}
              placeholder="All countries"
              // Changing the country also clears the state filter (it belongs to the old country).
              onValueChange={(id) => onSearchChange({ countryId: id > 0 ? id : undefined, stateId: undefined, page: 1 })}
            />
            <LookupSelect
              aria-label="Filter by state"
              className="h-9 w-44"
              items={states.data}
              disabled={search.countryId === undefined}
              value={search.stateId}
              placeholder="All states"
              onValueChange={(id) => onSearchChange({ stateId: id > 0 ? id : undefined, page: 1 })}
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
