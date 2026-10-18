import { z } from 'zod';
import { env } from '@/lib/env';
import { createTableSearchSchema, tableSearchDefaults, toTableFilter } from '@/lib/tableSearch';
import type { GenericTableFilter } from '@/types/generic-api';
import { USER_SORTABLE_FIELDS, type User } from './user';

/** URL contract of the users list: generic table params + `status` and `roleId` filters. */
const tableOptions = { defaultPageSize: env.VITE_DEFAULT_PAGE_SIZE };

export const USER_STATUS_FILTERS = ['active', 'inactive'] as const;

export const userSearchSchema = createTableSearchSchema(USER_SORTABLE_FIELDS, tableOptions).extend({
  status: z.enum(USER_STATUS_FILTERS).optional().catch(undefined),
  roleId: z.coerce.number().int().positive().optional().catch(undefined),
});
export type UserSearch = z.output<typeof userSearchSchema>;
export const userSearchDefaults = tableSearchDefaults(tableOptions);

/** `status` (readable in the URL) -> API `isActive`; `roleId` passes through. */
export function toUserFilter(search: UserSearch): GenericTableFilter<User> {
  const filter = toTableFilter<User>(search, USER_SORTABLE_FIELDS);
  const filters: Record<string, string | number | boolean> = {};
  if (search.status !== undefined) filters.isActive = search.status === 'active';
  if (search.roleId !== undefined) filters.roleId = search.roleId;
  return Object.keys(filters).length > 0
    ? { ...filter, filters }
    : filter;
}
