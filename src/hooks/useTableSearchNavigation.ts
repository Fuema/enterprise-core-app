import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import type { TableSearch } from '@/lib/tableSearch';

/**
 * Binds GenericDataTable (and feature filters) to the CURRENT route's search
 * params. The patch is type-checked against `TSearch`; the route's own
 * `validateSearch` schema re-validates the result, so an invalid value can
 * never reach the page.
 *
 * @example
 * const search = Route.useSearch();
 * const onSearchChange = useTableSearchNavigation<EmployeeSearch>();
 * <GenericDataTable search={search} onSearchChange={onSearchChange} ... />
 * onSearchChange({ countryId: 2, page: 1 });   // feature filter
 */
export function useTableSearchNavigation<TSearch extends TableSearch = TableSearch>(): (
  patch: Partial<TSearch>,
) => void {
  const navigate = useNavigate();
  return useCallback(
    (patch: Partial<TSearch>) => {
      void navigate({
        to: '.',
        // Route-agnostic updater: typed by `patch`, validated by the route schema.
        search: ((previous: Record<string, unknown>) => ({ ...previous, ...patch })) as never,
        replace: true,
      });
    },
    [navigate],
  );
}
