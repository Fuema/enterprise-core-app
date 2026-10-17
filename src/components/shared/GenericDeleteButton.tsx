import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { GenericActionGuard } from '@/components/shared/GenericActionGuard';
import { Button } from '@/components/ui/Button';
import { useDeleteEntity, type EntityMutationOptions } from '@/hooks/useEntityMutations';
import type { BaseApiService } from '@/services/BaseApiService';
import type { EntityId, Identifiable } from '@/types/generic-api';

export interface GenericDeleteButtonProps<TEntity extends Identifiable<TId>, TId extends EntityId, TCreate, TUpdate> {
  service: BaseApiService<TEntity, TId, TCreate, TUpdate>;
  entity: TEntity;
  /** Human name used in the accessible labels: "Delete <label>", "Confirm delete <label>". */
  label: string;
  /** Scopes required to see the button, e.g. ['countries:delete']. */
  permissions: readonly string[];
  onDeleted?: () => void;
  size?: 'sm' | 'default';
  /** Extra query keys to invalidate after deleting (see useDeleteEntity). */
  mutationOptions?: EntityMutationOptions;
}

/**
 * Guarded delete with inline two-step confirmation (no window.confirm). The
 * server's ProblemDetails (e.g. 409 "Country is in use") is shown next to it.
 *
 * @example
 * <GenericDeleteButton service={countryService} entity={country} label={country.name}
 *   permissions={[COUNTRY_PERMISSIONS.delete]} />
 */
export function GenericDeleteButton<TEntity extends Identifiable<TId>, TId extends EntityId, TCreate, TUpdate>({
  service,
  entity,
  label,
  permissions,
  onDeleted,
  size = 'sm',
  mutationOptions,
}: GenericDeleteButtonProps<TEntity, TId, TCreate, TUpdate>) {
  const [confirming, setConfirming] = useState(false);
  const deleteMutation = useDeleteEntity(service, mutationOptions);

  const confirmDelete = () => {
    deleteMutation.mutate(entity.id, {
      onSuccess: () => {
        setConfirming(false);
        onDeleted?.();
      },
    });
  };

  return (
    <GenericActionGuard permissions={permissions}>
      {confirming ? (
        <span className="inline-flex flex-wrap items-center gap-1">
          <Button
            variant="destructive"
            size={size}
            disabled={deleteMutation.isPending}
            onClick={confirmDelete}
            aria-label={`Confirm delete ${label}`}
          >
            Confirm
          </Button>
          <Button
            variant="ghost"
            size={size}
            onClick={() => {
              setConfirming(false);
              deleteMutation.reset();
            }}
          >
            Cancel
          </Button>
          {deleteMutation.isError && (
            <span role="alert" className="max-w-xs text-xs text-destructive">
              {deleteMutation.error.detail ?? deleteMutation.error.title}
            </span>
          )}
        </span>
      ) : (
        <Button variant="ghost" size={size} onClick={() => setConfirming(true)} aria-label={`Delete ${label}`}>
          <Trash2 />
          {size === 'default' && 'Delete'}
        </Button>
      )}
    </GenericActionGuard>
  );
}
