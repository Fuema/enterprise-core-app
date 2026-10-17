import { z } from 'zod';
import { env } from '@/lib/env';
import { createTableSearchSchema, tableSearchDefaults, toTableFilter } from '@/lib/tableSearch';
import type { GenericTableFilter } from '@/types/generic-api';
import { EMPLOYEE_SORTABLE_FIELDS, type Employee } from './employee';

/**
 * URL contract of the employees list:
 *   generic table params (page, pageSize, search, sort, selected)
 *   + feature filter `department`
 */
const tableOptions = { defaultPageSize: env.VITE_DEFAULT_PAGE_SIZE };

export const employeeSearchSchema = createTableSearchSchema(EMPLOYEE_SORTABLE_FIELDS, tableOptions).extend({
  department: z.string().optional().catch(undefined),
});

export type EmployeeSearch = z.output<typeof employeeSearchSchema>;

/** Values omitted from the URL (see the route's `search.middlewares`). */
export const employeeSearchDefaults = tableSearchDefaults(tableOptions);

/** URL state -> filter passed to BaseApiService.getAll (and used as the query key). */
export function toEmployeeFilter(search: EmployeeSearch): GenericTableFilter<Employee> {
  const filter = toTableFilter<Employee>(search, EMPLOYEE_SORTABLE_FIELDS);
  return search.department ? { ...filter, filters: { department: search.department } } : filter;
}
