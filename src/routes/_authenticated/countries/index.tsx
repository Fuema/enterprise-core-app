import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, stripSearchParams, useLocation } from '@tanstack/react-router';
import { Plus, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { GenericActionGuard } from '@/components/shared/GenericActionGuard';
import { GenericDataTable } from '@/components/shared/GenericDataTable';
import { Button } from '@/components/ui/Button';
import { countryColumns } from '@/features/locations/countries/components/countryColumns';
import { countryQueries } from '@/features/locations/countries/services/countryService';
import { COUNTRY_PERMISSIONS, type Country } from '@/features/locations/countries/types/country';
import { countrySearchDefaults, countrySearchSchema, toCountryFilter, type CountrySearch } from '@/features/locations/countries/types/countrySearch';
import { useTableSearchNavigation } from '@/hooks/useTableSearchNavigation';
import { searchMemory } from '@/lib/searchMemory';

const EMPTY_ROWS: Country[] = [];

export const Route = createFileRoute('/_authenticated/countries/')({
  validateSearch: countrySearchSchema,
  search: { middlewares: [stripSearchParams(countrySearchDefaults)] },
  loaderDeps: ({ search }) => ({ filter: toCountryFilter(search) }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(countryQueries.list(deps.filter)),
  component: CountriesPage,
});

function CountriesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { pathname } = useLocation();
  const onSearchChange = useTableSearchNavigation<CountrySearch>();

  const filter = useMemo(() => toCountryFilter(search), [search]);
  const query = useQuery({ ...countryQueries.list(filter), placeholderData: keepPreviousData });

  const resetView = () => {
    searchMemory.forget(pathname);
    void navigate({ search: {}, replace: true });
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Countries</h1>
          <p className="text-sm text-muted-foreground">Countries used by states, cities and employees.</p>
        </div>
        <GenericActionGuard permissions={[COUNTRY_PERMISSIONS.write]}>
          <Button asChild>
            <Link to="/countries/new">
              <Plus />
              New country
            </Link>
          </Button>
        </GenericActionGuard>
      </div>

      <GenericDataTable
        data={query.data?.data ?? EMPTY_ROWS}
        columns={countryColumns}
        totalCount={query.data?.totalCount ?? 0}
        search={search}
        onSearchChange={onSearchChange}
        getRowId={(row) => String(row.id)}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        searchPlaceholder="Search countries…"
        onRowClick={(row) => void navigate({ to: '/countries/$countryId', params: { countryId: row.id } })}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
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
