import { BaseApiService } from '@/services/BaseApiService';
import { entityQueries } from '@/services/entityQueries';
import { lookupQueries } from '@/services/lookupService';
import type { EntityMutationOptions } from '@/hooks/useEntityMutations';
import { countrySchema, type Country, type CountryId, type CountryInput } from '../types/country';

class CountryService extends BaseApiService<Country, CountryId, CountryInput, CountryInput> {
  constructor() {
    super('/countries', { schema: countrySchema });
  }
}

export const countryService = new CountryService();
export const countryQueries = entityQueries(countryService);

/** Country changes must refresh every location dropdown (employee form, filters). */
export const countryMutationOptions: EntityMutationOptions = { invalidate: [lookupQueries.all] };
