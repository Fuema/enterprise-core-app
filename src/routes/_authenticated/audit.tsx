import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AUDIT_PERMISSIONS } from '@/features/access/audit/types/audit';
import { requirePermissions } from '@/features/auth/guards';

export const Route = createFileRoute('/_authenticated/audit')({
  staticData: { breadcrumb: 'Audit log', permissions: [AUDIT_PERMISSIONS.read] },
  beforeLoad: requirePermissions([AUDIT_PERMISSIONS.read]),
  component: Outlet,
});
