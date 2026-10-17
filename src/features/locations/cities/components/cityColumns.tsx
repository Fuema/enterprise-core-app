import { Link } from '@tanstack/react-router';
import { GenericDeleteButton } from '@/components/shared/GenericDeleteButton';
import { dataTableColumnHelper } from '@/lib/dataTable';
import { cityMutationOptions, cityService } from '../services/cityService';
import { CITY_PERMISSIONS, type City } from '../types/city';

const col = dataTableColumnHelper<City>();

/** Module-scope columns; ids match CITY_SORTABLE_FIELDS. */
export const cityColumns = col.columns([
  col.accessor('name', {
    header: 'City',
    cell: ({ row }) => (
      <Link
        to="/cities/$cityId"
        params={{ cityId: row.original.id }}
        className="font-medium text-foreground underline-offset-4 hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {row.original.name}
      </Link>
    ),
  }),
  col.accessor('stateName', { header: 'State' }),
  col.accessor('countryName', { header: 'Country' }),
  col.accessor('employeeCount', { header: 'Employees' }),
  col.display({
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
        <GenericDeleteButton
          service={cityService}
          entity={row.original}
          label={row.original.name}
          permissions={[CITY_PERMISSIONS.delete]}
          mutationOptions={cityMutationOptions}
        />
      </div>
    ),
  }),
]);
