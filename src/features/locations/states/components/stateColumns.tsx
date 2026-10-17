import { Link } from '@tanstack/react-router';
import { GenericDeleteButton } from '@/components/shared/GenericDeleteButton';
import { dataTableColumnHelper } from '@/lib/dataTable';
import { stateMutationOptions, stateService } from '../services/stateService';
import { STATE_PERMISSIONS, type State } from '../types/state';

const col = dataTableColumnHelper<State>();

/** Module-scope columns; ids match STATE_SORTABLE_FIELDS. */
export const stateColumns = col.columns([
  col.accessor('name', {
    header: 'State',
    cell: ({ row }) => (
      <Link
        to="/states/$stateId"
        params={{ stateId: row.original.id }}
        className="font-medium text-foreground underline-offset-4 hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {row.original.name}
      </Link>
    ),
  }),
  col.accessor('countryName', { header: 'Country' }),
  col.accessor('cityCount', { header: 'Cities' }),
  col.accessor('employeeCount', { header: 'Employees' }),
  col.display({
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
        <GenericDeleteButton
          service={stateService}
          entity={row.original}
          label={row.original.name}
          permissions={[STATE_PERMISSIONS.delete]}
          mutationOptions={stateMutationOptions}
        />
      </div>
    ),
  }),
]);
