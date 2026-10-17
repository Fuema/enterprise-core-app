import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requirePermissions } from '@/features/auth/guards';
import { CITY_PERMISSIONS } from '@/features/locations/cities/types/city';

/** Feature layout: breadcrumb + read permission inherited by every city page. */
export const Route = createFileRoute('/_authenticated/cities')({
  staticData: { breadcrumb: 'Cities', permissions: [CITY_PERMISSIONS.read] },
  beforeLoad: requirePermissions([CITY_PERMISSIONS.read]),
  component: Outlet,
});
