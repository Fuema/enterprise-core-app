import { queryParam } from './http';

/**
 * Generic list behaviour of the API (Infrastructure/Paging.cs + SortMap) for
 * mock resources: multi-term search, allow-listed multi-sort with a default
 * and an id tie-breaker, page size clamped to 1..100.
 */
export interface ListSpec<T extends { id: number }> {
  sortable: readonly (keyof T & string)[];
  searchable: readonly (keyof T & string)[];
  defaultSort: keyof T & string;
}

function compareValues(left: unknown, right: unknown): number {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right), undefined, { sensitivity: 'base' });
}

export function listPage<T extends { id: number }>(rows: readonly T[], url: URL, spec: ListSpec<T>) {
  const page = Math.max(1, Number(queryParam(url, 'page') ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(queryParam(url, 'pageSize') ?? 20) || 20));
  const terms = (queryParam(url, 'search') ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 5);

  let result = [...rows];
  for (const term of terms) {
    result = result.filter((row) => spec.searchable.some((field) => String(row[field]).toLowerCase().includes(term)));
  }

  const tokens = (queryParam(url, 'sort') ?? '')
    .split(',')
    .map((part) => part.split('.') as [string, string | undefined])
    .filter(([field]) => (spec.sortable as readonly string[]).includes(field))
    .slice(0, 5);
  const effective = tokens.length > 0 ? tokens : [[spec.defaultSort, 'asc'] as [string, string]];
  result.sort((a, b) => {
    for (const [field, direction] of effective) {
      const order = compareValues(a[field as keyof T], b[field as keyof T]);
      if (order !== 0) return direction === 'desc' ? -order : order;
    }
    return a.id - b.id;
  });

  const start = (page - 1) * pageSize;
  return { data: result.slice(start, start + pageSize), totalCount: result.length, pageSize, currentPage: page };
}
