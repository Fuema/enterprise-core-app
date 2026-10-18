import { createFileRoute, Outlet } from '@tanstack/react-router';
import { ROLE_PERMISSIONS } from '@/features/access/roles/types/role';
import { requirePermissions } from '@/features/auth/guards';

/** Feature layout: breadcrumb + roles:read for every role page. */
export const Route = createFileRoute('/_authenticated/roles')({
  staticData: { breadcrumb: 'Roles', permissions: [ROLE_PERMISSIONS.read] },
  beforeLoad: requirePermissions([ROLE_PERMISSIONS.read]),
  component: Outlet,
});
