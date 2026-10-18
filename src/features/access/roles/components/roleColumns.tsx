import { Link } from '@tanstack/react-router';
import { GenericDeleteButton } from '@/components/shared/GenericDeleteButton';
import { Badge } from '@/components/ui/Badge';
import { dataTableColumnHelper } from '@/lib/dataTable';
import { roleMutationOptions, roleService } from '../services/roleService';
import { ROLE_PERMISSIONS, type Role } from '../types/role';

const col = dataTableColumnHelper<Role>();

export function permissionSummary(permissions: readonly string[]): string {
  if (permissions.includes('*')) return 'Every permission (*)';
  if (permissions.length === 0) return 'No permissions';
  return permissions.join(', ');
}

/** Module-scope columns; sortable ids match ROLE_SORTABLE_FIELDS. */
export const roleColumns = col.columns([
  col.accessor('name', {
    header: 'Role',
    cell: ({ row }) => (
      <span className="flex items-center gap-2">
        <Link
          to="/roles/$roleId"
          params={{ roleId: row.original.id }}
          className="font-medium text-foreground underline-offset-4 hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.name}
        </Link>
        {row.original.isSystem && <Badge variant="muted">System</Badge>}
      </span>
    ),
  }),
  col.accessor('description', { header: 'Description', enableSorting: false, cell: ({ getValue }) => getValue() ?? '—' }),
  col.accessor('userCount', { header: 'Users' }),
  col.display({
    id: 'permissions',
    header: 'Permissions',
    enableSorting: false,
    cell: ({ row }) => <span className="line-clamp-2 text-xs">{permissionSummary(row.original.permissions)}</span>,
  }),
  col.display({
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    enableSorting: false,
    cell: ({ row }) =>
      row.original.isSystem ? null : (
        <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
          <GenericDeleteButton
            service={roleService}
            entity={row.original}
            label={row.original.name}
            permissions={[ROLE_PERMISSIONS.delete]}
            mutationOptions={roleMutationOptions}
          />
        </div>
      ),
  }),
]);
