import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/Badge';
import { dataTableColumnHelper } from '@/lib/dataTable';
import { isLockedOut, type User } from '../types/user';

const col = dataTableColumnHelper<User>();
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

/** Module-scope columns; sortable ids match USER_SORTABLE_FIELDS. */
export const userColumns = col.columns([
  col.accessor('username', {
    header: 'Username',
    cell: ({ row }) => (
      <Link
        to="/users/$userId"
        params={{ userId: row.original.id }}
        className="font-medium text-foreground underline-offset-4 hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {row.original.username}
      </Link>
    ),
  }),
  col.accessor('displayName', { header: 'Full name' }),
  col.accessor('email', { header: 'Email', cell: ({ getValue }) => getValue() ?? '—' }),
  col.display({
    id: 'roles',
    header: 'Roles',
    enableSorting: false,
    cell: ({ row }) => {
      const { roles, directPermissionCount } = row.original;
      const names = roles.map((role) => role.name).join(', ') || 'No roles';
      return directPermissionCount > 0 ? `${names} +${String(directPermissionCount)} extra` : names;
    },
  }),
  col.accessor('isActive', {
    header: 'Status',
    cell: ({ row }) => (
      <span className="flex flex-wrap gap-1">
        {row.original.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>}
        {isLockedOut(row.original) && <Badge variant="destructive">Locked</Badge>}
        {row.original.mustChangePassword && <Badge variant="warning">Must change password</Badge>}
      </span>
    ),
  }),
  col.accessor('lastLoginAtUtc', {
    header: 'Last sign-in',
    cell: ({ getValue }) => {
      const value = getValue();
      return value ? dateFormat.format(new Date(value)) : 'Never';
    },
  }),
]);
