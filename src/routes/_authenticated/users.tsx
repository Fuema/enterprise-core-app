import { createFileRoute, Outlet } from '@tanstack/react-router';
import { USER_PERMISSIONS } from '@/features/access/users/types/user';
import { requirePermissions } from '@/features/auth/guards';

/** Feature layout: breadcrumb + users:read for every account page. */
export const Route = createFileRoute('/_authenticated/users')({
  staticData: { breadcrumb: 'Users', permissions: [USER_PERMISSIONS.read] },
  beforeLoad: requirePermissions([USER_PERMISSIONS.read]),
  component: Outlet,
});
