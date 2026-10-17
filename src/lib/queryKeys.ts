import type { EntityId, GenericTableFilter } from '@/types/generic-api';

/**
 * Hierarchical query-key factory shared by BaseApiService, the CRUD query
 * helpers and GenericHubService, so cache updates always hit the same keys.
 *
 *   [resource]                       -> everything for the resource
 *   [resource, 'list']               -> every list/page
 *   [resource, 'list', filter]       -> one page
 *   [resource, 'detail']             -> every detail
 *   [resource, 'detail', id]         -> one entity
 */
export function createQueryKeys<TEntity, TId extends EntityId = EntityId>(resource: string) {
  return {
    all: [resource] as const,
    lists: () => [resource, 'list'] as const,
    list: (filter: GenericTableFilter<TEntity>) => [resource, 'list', filter] as const,
    details: () => [resource, 'detail'] as const,
    detail: (id: TId) => [resource, 'detail', id] as const,
  };
}

export type QueryKeys<TEntity, TId extends EntityId = EntityId> = ReturnType<typeof createQueryKeys<TEntity, TId>>;
