import { createFileRoute, Outlet } from '@tanstack/react-router';
import { EMPLOYEE_PERMISSIONS } from '@/features/employees/types/employee';
import { requirePermissions } from '@/features/auth/guards';

/**
 * Feature layout route: one place for the feature's breadcrumb and read
 * permission. Every child (/employees, /employees/new, /employees/:id)
 * inherits both, so the trail reads  Home / Employees / <child>.
 */
export const Route = createFileRoute('/_authenticated/employees')({
  staticData: { breadcrumb: 'Employees', permissions: [EMPLOYEE_PERMISSIONS.read] },
  beforeLoad: requirePermissions([EMPLOYEE_PERMISSIONS.read]),
  component: Outlet,
});
