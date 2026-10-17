import type { EntityMutationOptions } from '@/hooks/useEntityMutations';
import { BaseApiService } from '@/services/BaseApiService';
import { entityQueries } from '@/services/entityQueries';
import { lookupQueries } from '@/services/lookupService';
import { stateSchema, type State, type StateId, type StateInput } from '../types/state';

class StateService extends BaseApiService<State, StateId, StateInput, StateInput> {
  constructor() {
    super('/states', { schema: stateSchema });
  }
}

export const stateService = new StateService();
export const stateQueries = entityQueries(stateService);

/** State changes must refresh every location dropdown. */
export const stateMutationOptions: EntityMutationOptions = { invalidate: [lookupQueries.all] };
