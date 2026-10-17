import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requirePermissions } from '@/features/auth/guards';
import { STATE_PERMISSIONS } from '@/features/locations/states/types/state';

/** Feature layout: breadcrumb + read permission inherited by every state page. */
export const Route = createFileRoute('/_authenticated/states')({
  staticData: { breadcrumb: 'States', permissions: [STATE_PERMISSIONS.read] },
  beforeLoad: requirePermissions([STATE_PERMISSIONS.read]),
  component: Outlet,
});
