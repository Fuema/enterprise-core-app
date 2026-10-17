import { z } from 'zod';
import { env } from '@/lib/env';
import { createTableSearchSchema, tableSearchDefaults, toTableFilter } from '@/lib/tableSearch';
import type { GenericTableFilter } from '@/types/generic-api';
import { STATE_SORTABLE_FIELDS, type State } from './state';

/** URL contract of the states list: generic table params + `countryId` filter. */
const tableOptions = { defaultPageSize: env.VITE_DEFAULT_PAGE_SIZE };

export const stateSearchSchema = createTableSearchSchema(STATE_SORTABLE_FIELDS, tableOptions).extend({
  countryId: z.coerce.number().int().positive().optional().catch(undefined),
});
export type StateSearch = z.output<typeof stateSearchSchema>;
export const stateSearchDefaults = tableSearchDefaults(tableOptions);

export function toStateFilter(search: StateSearch): GenericTableFilter<State> {
  const filter = toTableFilter<State>(search, STATE_SORTABLE_FIELDS);
  return search.countryId === undefined ? filter : { ...filter, filters: { countryId: search.countryId } };
}
