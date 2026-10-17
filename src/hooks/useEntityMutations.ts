import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BaseApiService } from '@/services/BaseApiService';
import type { EntityId, Identifiable } from '@/types/generic-api';

/**
 * Generic CRUD mutations with consistent cache maintenance:
 *  - create/update write the returned entity into its detail cache
 *  - every mutation invalidates the resource's lists (counts/order may change)
 */

export function useCreateEntity<TEntity extends Identifiable<TId>, TId extends EntityId, TCreate, TUpdate>(
  service: BaseApiService<TEntity, TId, TCreate, TUpdate>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TCreate) => service.create(payload),
    onSuccess: async (entity) => {
      queryClient.setQueryData(service.keys.detail(entity.id), entity);
      await queryClient.invalidateQueries({ queryKey: service.keys.lists() });
    },
  });
}

export function useUpdateEntity<TEntity extends Identifiable<TId>, TId extends EntityId, TCreate, TUpdate>(
  service: BaseApiService<TEntity, TId, TCreate, TUpdate>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: TId; payload: TUpdate }) => service.update(id, payload),
    onSuccess: async (entity) => {
      queryClient.setQueryData(service.keys.detail(entity.id), entity);
      await queryClient.invalidateQueries({ queryKey: service.keys.lists() });
    },
  });
}

export function useDeleteEntity<TEntity extends Identifiable<TId>, TId extends EntityId, TCreate, TUpdate>(
  service: BaseApiService<TEntity, TId, TCreate, TUpdate>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: TId) => service.delete(id),
    onSuccess: async (_result, id) => {
      queryClient.removeQueries({ queryKey: service.keys.detail(id) });
      await queryClient.invalidateQueries({ queryKey: service.keys.lists() });
    },
  });
}
