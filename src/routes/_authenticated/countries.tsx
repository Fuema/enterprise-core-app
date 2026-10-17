import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requirePermissions } from '@/features/auth/guards';
import { COUNTRY_PERMISSIONS } from '@/features/locations/countries/types/country';

/** Feature layout: breadcrumb + read permission inherited by every country page. */
export const Route = createFileRoute('/_authenticated/countries')({
  staticData: { breadcrumb: 'Countries', permissions: [COUNTRY_PERMISSIONS.read] },
  beforeLoad: requirePermissions([COUNTRY_PERMISSIONS.read]),
  component: Outlet,
});
