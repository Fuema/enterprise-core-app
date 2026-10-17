import { Link } from '@tanstack/react-router';
import { dataTableColumnHelper } from '@/lib/dataTable';
import { employeeFullName, employeeLocation, type Employee } from '../types/employee';
import { DeleteEmployeeButton } from './DeleteEmployeeButton';

const col = dataTableColumnHelper<Employee>();

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' });

/**
 * Column definitions at module scope (stable reference, required by TanStack Table v9).
 * Column ids MUST match EMPLOYEE_SORTABLE_FIELDS for sortable columns.
 */
export const employeeColumns = col.columns([
  col.accessor('lastName', {
    header: 'Name',
    cell: ({ row }) => (
      <Link
        to="/employees/$employeeId"
        params={{ employeeId: row.original.id }}
        className="font-medium text-foreground underline-offset-4 hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {employeeFullName(row.original)}
      </Link>
    ),
  }),
  col.accessor('email', { header: 'Email' }),
  col.accessor('gender', { header: 'Gender' }),
  col.accessor('dateOfBirth', {
    header: 'Born',
    cell: ({ getValue }) => dateFormat.format(new Date(getValue())),
  }),
  col.accessor('cityName', {
    header: 'Location',
    cell: ({ row }) => employeeLocation(row.original),
  }),
  col.accessor('pincode', { header: 'Pincode' }),
  col.display({
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
        <DeleteEmployeeButton employee={row.original} />
      </div>
    ),
  }),
]);
