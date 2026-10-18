import { z } from 'zod';
import { env } from '@/lib/env';
import { createTableSearchSchema, tableSearchDefaults, toTableFilter } from '@/lib/tableSearch';
import type { GenericTableFilter } from '@/types/generic-api';
import { AUDIT_SORTABLE_FIELDS, AUDIT_TARGET_TYPES, type AuditEntry } from './audit';

const tableOptions = { defaultPageSize: env.VITE_DEFAULT_PAGE_SIZE };
const isoDay = z.iso.date().optional().catch(undefined);

/** URL contract of the audit log: table params + action, target type and a UTC date range. */
export const auditSearchSchema = createTableSearchSchema(AUDIT_SORTABLE_FIELDS, tableOptions).extend({
  action: z.string().max(64).optional().catch(undefined),
  targetType: z.enum(AUDIT_TARGET_TYPES).optional().catch(undefined),
  from: isoDay,
  to: isoDay,
});
export type AuditSearch = z.output<typeof auditSearchSchema>;
export const auditSearchDefaults = tableSearchDefaults(tableOptions);

export function toAuditFilter(search: AuditSearch): GenericTableFilter<AuditEntry> {
  const filter = toTableFilter<AuditEntry>(search, AUDIT_SORTABLE_FIELDS);
  const filters: Record<string, string> = {};
  if (search.action) filters.action = search.action;
  if (search.targetType) filters.targetType = search.targetType;
  if (search.from) filters.from = search.from;
  if (search.to) filters.to = search.to;
  return Object.keys(filters).length > 0
    ? { ...filter, filters }
    : filter;
}
