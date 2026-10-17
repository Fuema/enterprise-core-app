import type { z } from 'zod';
import { env } from '@/lib/env';
import { createTableSearchSchema, tableSearchDefaults, toTableFilter } from '@/lib/tableSearch';
import type { GenericTableFilter } from '@/types/generic-api';
import { COUNTRY_SORTABLE_FIELDS, type Country } from './country';

/** URL contract of the countries list: generic table params only. */
const tableOptions = { defaultPageSize: env.VITE_DEFAULT_PAGE_SIZE };

export const countrySearchSchema = createTableSearchSchema(COUNTRY_SORTABLE_FIELDS, tableOptions);
export type CountrySearch = z.output<typeof countrySearchSchema>;
export const countrySearchDefaults = tableSearchDefaults(tableOptions);

export function toCountryFilter(search: CountrySearch): GenericTableFilter<Country> {
  return toTableFilter<Country>(search, COUNTRY_SORTABLE_FIELDS);
}
