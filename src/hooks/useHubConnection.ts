import { useEffect, useSyncExternalStore } from 'react';
import type { GenericHubService, HubStatus } from '@/services/GenericHubService';
import type { EntityId, Identifiable } from '@/types/generic-api';

/**
 * Starts a hub while the calling component is mounted and exposes its status.
 * Create the hub instance once (module scope or useState initialiser), not per render.
 */
export function useHubConnection<TEntity extends Identifiable<TId>, TId extends EntityId>(
  hub: GenericHubService<TEntity, TId>,
): HubStatus {
  useEffect(() => {
    hub.start().catch((error: unknown) => {
      console.warn('[hub] could not connect', error);
    });
    return () => {
      void hub.stop();
    };
  }, [hub]);

  return useSyncExternalStore(hub.subscribe, hub.getStatus, hub.getStatus);
}
