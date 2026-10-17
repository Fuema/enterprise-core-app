import type { EntityMutationOptions } from '@/hooks/useEntityMutations';
import { BaseApiService } from '@/services/BaseApiService';
import { entityQueries } from '@/services/entityQueries';
import { lookupQueries } from '@/services/lookupService';
import { citySchema, type City, type CityId, type CityInput } from '../types/city';

class CityService extends BaseApiService<City, CityId, CityInput, CityInput> {
  constructor() {
    super('/cities', { schema: citySchema });
  }
}

export const cityService = new CityService();
export const cityQueries = entityQueries(cityService);

/** City changes must refresh every location dropdown. */
export const cityMutationOptions: EntityMutationOptions = { invalidate: [lookupQueries.all] };
