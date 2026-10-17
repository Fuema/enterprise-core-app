import {
  columnVisibilityFeature,
  createColumnHelper,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table';

/**
 * TanStack Table v9 feature set used by GenericDataTable.
 *
 * v9 is tree-shaken: only registered features exist on the table/row/column
 * APIs. Sorting and pagination are server-side (manual), so no client row-model
 * factories are registered. Defined once at module scope (stable reference).
 */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
});

export type DataTableFeatures = typeof dataTableFeatures;

/** Column definition type for GenericDataTable. */
export type DataTableColumn<TData extends RowData, TValue = unknown> = ColumnDef<DataTableFeatures, TData, TValue>;

/**
 * Typed column helper bound to the table's feature set.
 *
 * @example
 * const col = dataTableColumnHelper<Employee>();
 * export const employeeColumns = col.columns([
 *   col.accessor('lastName', { header: 'Last name' }),
 *   col.accessor('hireDate', { header: 'Hired', enableSorting: true }),
 * ]);
 */
export function dataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>();
}
