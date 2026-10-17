import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/Badge';
import { dataTableColumnHelper } from '@/lib/dataTable';
import type { User } from '../types/user';

const col = dataTableColumnHelper<User>();

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

/** "Administrator (*)", "6 permissions", "No access". */
function accessSummary(permissions: readonly string[]): string {
  if (permissions.includes('*')) return 'Administrator (*)';
  if (permissions.length === 0) return 'No access';
  return `${String(permissions.length)} permission${permissions.length === 1 ? '' : 's'}`;
}

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
    cell: ({ row }) => row.original.roles.join(', ') || '—',
  }),
  col.display({
    id: 'access',
    header: 'Access',
    enableSorting: false,
    cell: ({ row }) => accessSummary(row.original.permissions),
  }),
  col.accessor('isActive', {
    header: 'Status',
    cell: ({ getValue }) =>
      getValue() ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>,
  }),
  col.accessor('createdAtUtc', {
    header: 'Joined',
    cell: ({ getValue }) => dateFormat.format(new Date(getValue())),
  }),
]);
