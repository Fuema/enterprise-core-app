import { z } from 'zod';
import { env } from '@/lib/env';
import { createTableSearchSchema, tableSearchDefaults, toTableFilter } from '@/lib/tableSearch';
import type { GenericTableFilter } from '@/types/generic-api';
import { EMPLOYEE_GENDERS, EMPLOYEE_SORTABLE_FIELDS, type Employee } from './employee';

/**
 * URL contract of the employees list:
 *   generic table params (page, pageSize, search, sort, selected)
 *   + feature filters `countryId` and `gender`
 * Invalid values are dropped (`.catch(undefined)`), never sent to the API.
 */
const tableOptions = { defaultPageSize: env.VITE_DEFAULT_PAGE_SIZE };

export const employeeSearchSchema = createTableSearchSchema(EMPLOYEE_SORTABLE_FIELDS, tableOptions).extend({
  countryId: z.coerce.number().int().positive().optional().catch(undefined),
  gender: z.enum(EMPLOYEE_GENDERS).optional().catch(undefined),
});

export type EmployeeSearch = z.output<typeof employeeSearchSchema>;

/** Values omitted from the URL (see the route's `search.middlewares`). */
export const employeeSearchDefaults = tableSearchDefaults(tableOptions);

/** URL state -> filter passed to BaseApiService.getAll (and used as the query key). */
export function toEmployeeFilter(search: EmployeeSearch): GenericTableFilter<Employee> {
  const filter = toTableFilter<Employee>(search, EMPLOYEE_SORTABLE_FIELDS);
  const filters: NonNullable<GenericTableFilter<Employee>['filters']> = {};
  if (search.countryId !== undefined) filters.countryId = search.countryId;
  if (search.gender !== undefined) filters.gender = search.gender;
  return Object.keys(filters).length > 0 ? { ...filter, filters } : filter;
}
