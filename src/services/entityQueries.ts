import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import type { EntityId, GenericTableFilter, Identifiable } from '@/types/generic-api';
import type { BaseApiService } from './BaseApiService';

/**
 * Query-option factories for any BaseApiService. Usable in route loaders
 * (`queryClient.ensureQueryData(...)`) and components (`useQuery(...)`).
 *
 * @example
 * const employeeQueries = entityQueries(employeeService);
 * loader: ({ context, deps }) => context.queryClient.ensureQueryData(employeeQueries.list(deps.filter))
 * const { data } = useQuery(employeeQueries.list(filter));
 */
export function entityQueries<TEntity extends Identifiable<TId>, TId extends EntityId, TCreate, TUpdate>(
  service: BaseApiService<TEntity, TId, TCreate, TUpdate>,
) {
  return {
    keys: service.keys,
    list: (filter: GenericTableFilter<TEntity>) =>
      queryOptions({
        queryKey: service.keys.list(filter),
        queryFn: ({ signal }) => service.getAll(filter, signal),
        // Keep the current page visible while the next one loads.
        placeholderData: keepPreviousData,
      }),
    detail: (id: TId) =>
      queryOptions({
        queryKey: service.keys.detail(id),
        queryFn: ({ signal }) => service.getById(id, signal),
      }),
  };
}
