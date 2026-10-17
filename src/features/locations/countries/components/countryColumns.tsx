import { Link } from '@tanstack/react-router';
import { GenericDeleteButton } from '@/components/shared/GenericDeleteButton';
import { dataTableColumnHelper } from '@/lib/dataTable';
import { countryMutationOptions, countryService } from '../services/countryService';
import { COUNTRY_PERMISSIONS, type Country } from '../types/country';

const col = dataTableColumnHelper<Country>();

/** Module-scope columns; ids match COUNTRY_SORTABLE_FIELDS. */
export const countryColumns = col.columns([
  col.accessor('name', {
    header: 'Country',
    cell: ({ row }) => (
      <Link
        to="/countries/$countryId"
        params={{ countryId: row.original.id }}
        className="font-medium text-foreground underline-offset-4 hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {row.original.name}
      </Link>
    ),
  }),
  col.accessor('stateCount', { header: 'States' }),
  col.accessor('employeeCount', { header: 'Employees' }),
  col.display({
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
        <GenericDeleteButton
          service={countryService}
          entity={row.original}
          label={row.original.name}
          permissions={[COUNTRY_PERMISSIONS.delete]}
          mutationOptions={countryMutationOptions}
        />
      </div>
    ),
  }),
]);
