import { z } from 'zod';
import type { GenericTableFilter, SortConfig, SortDirection, SortableField } from '@/types/generic-api';

/**
 * URL contract for every server-driven table:
 *   ?page=2&pageSize=20&search=smith&sort=lastName.asc,hireDate.desc&selected=12,15
 *
 * `sort` is validated against an explicit allow-list of fields, so a tampered
 * URL can never send an arbitrary column name to the backend.
 */

/** Router search params may arrive as numbers ("?search=123" -> 123). */
const looseString = z.union([z.string(), z.number()]).transform((value) => String(value).trim());

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface TableSearchOptions {
  defaultPageSize: number;
  maxPageSize?: number;
}

/**
 * Builds the `validateSearch` schema for a table route.
 *
 * @example
 *   validateSearch: createTableSearchSchema(['lastName', 'hireDate'] as const, { defaultPageSize: env.VITE_DEFAULT_PAGE_SIZE })
 */
export function createTableSearchSchema<const TField extends string>(
  sortableFields: readonly [TField, ...TField[]],
  { defaultPageSize, maxPageSize = 500 }: TableSearchOptions,
) {
  const token = new RegExp(`^(${sortableFields.map(escapeRegExp).join('|')})\\.(asc|desc)$`);
  return z.object({
    page: z.number().int().min(1).default(1).catch(1),
    pageSize: z.number().int().min(1).max(maxPageSize).default(defaultPageSize).catch(defaultPageSize),
    search: looseString.optional().catch(undefined),
    sort: z
      .string()
      .refine((value) => value.split(',').every((part) => token.test(part)), 'Invalid sort expression')
      .optional()
      .catch(undefined),
    selected: looseString.optional().catch(undefined),
  });
}

/**
 * Default values of the table URL contract. Strip them from the URL with
 * TanStack Router's `stripSearchParams` so URLs stay clean AND an "empty" URL
 * can be detected (required for search-memory restore in routes/__root.tsx):
 *
 *   search: { middlewares: [stripSearchParams(tableSearchDefaults(options))] }
 */
export function tableSearchDefaults({ defaultPageSize }: TableSearchOptions): { page: number; pageSize: number } {
  return { page: 1, pageSize: defaultPageSize };
}

/** Validated (output) shape shared by all table routes. */
export interface TableSearch {
  page: number;
  pageSize: number;
  search?: string | undefined;
  sort?: string | undefined;
  selected?: string | undefined;
}

export interface SortToken<TField extends string> {
  field: TField;
  direction: SortDirection;
}

/** "lastName.asc,hireDate.desc" -> [{ field: 'lastName', direction: 'asc' }, ...] */
export function parseSort<TField extends string>(
  sort: string | undefined,
  allowed: readonly TField[],
): SortToken<TField>[] {
  if (!sort) return [];
  const allowedSet = new Set<string>(allowed);
  const result: SortToken<TField>[] = [];
  for (const part of sort.split(',')) {
    const [field, direction] = part.split('.');
    if (field && allowedSet.has(field) && (direction === 'asc' || direction === 'desc')) {
      result.push({ field: field as TField, direction });
    }
  }
  return result;
}

export function serializeSort(tokens: readonly SortToken<string>[]): string | undefined {
  return tokens.length > 0 ? tokens.map((t) => `${t.field}.${t.direction}`).join(',') : undefined;
}

export function parseSelected(selected: string | undefined): string[] {
  return selected ? selected.split(',').filter((id) => id.length > 0) : [];
}

/** Converts validated URL state into the filter object passed to BaseApiService.getAll. */
export function toTableFilter<T>(
  search: TableSearch,
  sortableFields: readonly SortableField<T>[],
): GenericTableFilter<T> {
  const sort: SortConfig<T>[] = parseSort(search.sort, sortableFields);
  return {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.search ? { search: search.search } : {}),
    ...(sort.length > 0 ? { sort } : {}),
  };
}
