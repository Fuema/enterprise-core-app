import type { z } from 'zod';
import { env } from '@/lib/env';
import { createTableSearchSchema, tableSearchDefaults, toTableFilter } from '@/lib/tableSearch';
import type { GenericTableFilter } from '@/types/generic-api';
import { ROLE_SORTABLE_FIELDS, type Role } from './role';

const tableOptions = { defaultPageSize: env.VITE_DEFAULT_PAGE_SIZE };

export const roleSearchSchema = createTableSearchSchema(ROLE_SORTABLE_FIELDS, tableOptions);
export type RoleSearch = z.output<typeof roleSearchSchema>;
export const roleSearchDefaults = tableSearchDefaults(tableOptions);

export function toRoleFilter(search: RoleSearch): GenericTableFilter<Role> {
  return toTableFilter<Role>(search, ROLE_SORTABLE_FIELDS);
}
