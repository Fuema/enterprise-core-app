import {
  useTable,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Updater,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search } from 'lucide-react';
import { useEffect, useEffectEvent, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { dataTableFeatures, type DataTableColumn } from '@/lib/dataTable';
import { parseSelected, serializeSort, type SortToken, type TableSearch } from '@/lib/tableSearch';
import { cn } from '@/lib/utils';

export interface GenericDataTableProps<TData extends RowData> {
  /**
   * Current page of rows (server-side pagination). Must be a STABLE reference:
   * pass `query.data?.data ?? EMPTY_ROWS` with a module-level constant, never `?? []`.
   */
  data: TData[];
  /** Stable column definitions (module scope or useMemo). See dataTableColumnHelper. */
  columns: readonly DataTableColumn<TData>[];
  /** Total rows across all pages, from PaginatedResponse.totalCount. */
  totalCount: number;
  /** Validated URL state (Route.useSearch()). The URL is the single source of truth. */
  search: TableSearch;
  /** Writes state back to the URL (see useTableSearchNavigation). */
  onSearchChange: (patch: Partial<TableSearch>) => void;
  /** Stable row id; used for selection that survives paging. */
  getRowId: (row: TData) => string;
  enableRowSelection?: boolean;
  /** Show the debounced global search box. Default true. */
  enableSearch?: boolean;
  searchPlaceholder?: string;
  isLoading?: boolean;
  /** Background refetch indicator (keeps previous data visible). */
  isFetching?: boolean;
  pageSizeOptions?: readonly number[];
  emptyMessage?: ReactNode;
  /** Extra controls rendered on the toolbar's right side (filters, actions). */
  toolbar?: ReactNode;
  onRowClick?: (row: TData) => void;
  className?: string;
}

const SEARCH_DEBOUNCE_MS = 300;

function toSortingState(sort: string | undefined): SortingState {
  if (!sort) return [];
  return sort.split(',').flatMap((part) => {
    const [id, direction] = part.split('.');
    return id ? [{ id, desc: direction === 'desc' }] : [];
  });
}

function resolve<T>(updater: Updater<T>, current: T): T {
  return typeof updater === 'function' ? (updater as (old: T) => T)(current) : updater;
}

/**
 * Un-opinionated, server-driven data grid (TanStack Table + shadcn/ui).
 * Pagination, multi-column sorting, row selection and the search box are all
 * controlled by the route's typed search params:
 *   ?page=2&pageSize=20&search=ann&sort=lastName.asc&selected=4,9
 */
export function GenericDataTable<TData extends RowData>({
  data,
  columns,
  totalCount,
  search,
  onSearchChange,
  getRowId,
  enableRowSelection = false,
  enableSearch = true,
  searchPlaceholder = 'Search…',
  isLoading = false,
  isFetching = false,
  pageSizeOptions = [10, 20, 50, 100],
  emptyMessage = 'No results.',
  toolbar,
  onRowClick,
  className,
}: GenericDataTableProps<TData>) {
  const sorting = useMemo(() => toSortingState(search.sort), [search.sort]);
  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex: search.page - 1, pageSize: search.pageSize }),
    [search.page, search.pageSize],
  );
  const rowSelection = useMemo<RowSelectionState>(
    () => Object.fromEntries(parseSelected(search.selected).map((id) => [id, true])),
    [search.selected],
  );

  // TanStack Table v9: explicit feature set, no row-model factories (server-side processing).
  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    getRowId,
    manualPagination: true,
    manualSorting: true,
    enableMultiSort: true,
    enableRowSelection,
    rowCount: totalCount,
    state: { sorting, pagination, rowSelection },
    onSortingChange: (updater) => {
      const next = resolve(updater, sorting);
      onSearchChange({
        sort: serializeSort(
          next.map((s): SortToken<string> => ({ field: s.id, direction: s.desc ? 'desc' : 'asc' })),
        ),
        page: 1,
      });
    },
    onPaginationChange: (updater) => {
      const next = resolve(updater, pagination);
      onSearchChange({
        page: next.pageSize === pagination.pageSize ? next.pageIndex + 1 : 1,
        pageSize: next.pageSize,
      });
    },
    onRowSelectionChange: (updater) => {
      const next = resolve(updater, rowSelection);
      const ids = Object.keys(next).filter((id) => next[id]);
      onSearchChange({ selected: ids.length > 0 ? ids.join(',') : undefined });
    },
  });

  // ---- Debounced global search (local text, URL is updated after typing pauses)
  const urlSearch = search.search ?? '';
  const [text, setText] = useState(urlSearch);
  const [syncedSearch, setSyncedSearch] = useState(urlSearch);
  if (urlSearch !== syncedSearch) {
    // URL changed externally (back button, reset): adopt it during render.
    setSyncedSearch(urlSearch);
    setText(urlSearch);
  }
  const emitSearch = useEffectEvent((value: string) => {
    onSearchChange({ search: value.length > 0 ? value : undefined, page: 1 });
  });
  useEffect(() => {
    if (text.trim() === urlSearch) return;
    const timer = window.setTimeout(() => emitSearch(text.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [text, urlSearch]);

  const pageCount = Math.max(1, Math.ceil(totalCount / search.pageSize));
  const selectedCount = Object.keys(rowSelection).length;
  const visibleColumnCount = table.getVisibleLeafColumns().length + (enableRowSelection ? 1 : 0);

  return (
    <div className={cn('grid gap-3', className)}>
      {(enableSearch || toolbar !== undefined || selectedCount > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {enableSearch && (
              <div className="relative w-64 max-w-full">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label="Search"
                  className="pl-8"
                />
              </div>
            )}
            {selectedCount > 0 && (
              <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
            )}
          </div>
          {toolbar}
        </div>
      )}

      <div className={cn('rounded-md border transition-opacity', isFetching && !isLoading && 'opacity-70')}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {enableRowSelection && (
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all rows on this page"
                      className="size-4 accent-primary"
                      checked={table.getIsAllPageRowsSelected()}
                      ref={(el) => {
                        if (el) el.indeterminate = table.getIsSomePageRowsSelected();
                      }}
                      onChange={table.getToggleAllPageRowsSelectedHandler()}
                    />
                  </TableHead>
                )}
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const direction = header.column.getIsSorted();
                  const content = header.isPlaceholder ? null : <table.FlexRender header={header} />;
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : undefined}
                    >
                      {canSort ? (
                        <button
                          type="button"
                          className="-ml-2 inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-accent"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {content}
                          {direction === 'asc' ? (
                            <ArrowUp className="size-3.5" />
                          ) : direction === 'desc' ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ChevronsUpDown className="size-3.5 opacity-50" />
                          )}
                        </button>
                      ) : (
                        content
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: Math.min(search.pageSize, 8) }, (_, index) => (
                <TableRow key={`skeleton-${String(index)}`}>
                  <TableCell colSpan={visibleColumnCount}>
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className={cn(onRowClick && 'cursor-pointer')}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {enableRowSelection && (
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label="Select row"
                        className="size-4 accent-primary"
                        checked={row.getIsSelected()}
                        disabled={!row.getCanSelect()}
                        onChange={row.getToggleSelectedHandler()}
                      />
                    </TableCell>
                  )}
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          {totalCount.toLocaleString()} {totalCount === 1 ? 'record' : 'records'}
        </span>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            Rows per page
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-foreground"
              value={search.pageSize}
              onChange={(event) => table.setPageSize(Number(event.target.value))}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <span>
            Page {search.page} of {pageCount}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
