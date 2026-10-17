import { z } from 'zod';
import { env } from '@/lib/env';
import { createTableSearchSchema, tableSearchDefaults, toTableFilter } from '@/lib/tableSearch';
import type { GenericTableFilter } from '@/types/generic-api';
import { CITY_SORTABLE_FIELDS, type City } from './city';

/** URL contract of the cities list: generic table params + `countryId` / `stateId` filters. */
const tableOptions = { defaultPageSize: env.VITE_DEFAULT_PAGE_SIZE };
const positiveId = z.coerce.number().int().positive().optional().catch(undefined);

export const citySearchSchema = createTableSearchSchema(CITY_SORTABLE_FIELDS, tableOptions).extend({
  countryId: positiveId,
  stateId: positiveId,
});
export type CitySearch = z.output<typeof citySearchSchema>;
export const citySearchDefaults = tableSearchDefaults(tableOptions);

export function toCityFilter(search: CitySearch): GenericTableFilter<City> {
  const filter = toTableFilter<City>(search, CITY_SORTABLE_FIELDS);
  const filters: NonNullable<GenericTableFilter<City>['filters']> = {};
  if (search.countryId !== undefined) filters.countryId = search.countryId;
  if (search.stateId !== undefined) filters.stateId = search.stateId;
  return Object.keys(filters).length > 0 ? { ...filter, filters } : filter;
}
