import { redirect, type ParsedLocation } from '@tanstack/react-router';
import type { PermissionMode } from '@/lib/permissions';
import { currentUserCan, isAuthenticated, mustChangePassword } from './store/authStore';

/**
 * `beforeLoad` guard: unauthenticated users go to /login and come back
 * to the exact deep link (including search params) after signing in.
 */
export function requireAuthentication({ location }: { location: ParsedLocation }): void {
  if (!isAuthenticated()) {
    throw redirect({ to: '/login', search: { redirect: location.href }, replace: true });
  }
  // After an administrator's password reset the account page is the only place the user may go.
  if (mustChangePassword() && location.pathname !== ACCOUNT_PATH) {
    throw redirect({ to: ACCOUNT_PATH, replace: true });
  }
}

/** Route of the account page (change password, sessions). */
export const ACCOUNT_PATH = '/account';

/**
 * `beforeLoad` guard factory for route-level permissions.
 *
 * @example
 * export const Route = createFileRoute('/_authenticated/employees')({
 *   staticData: { breadcrumb: 'Employees', permissions: ['employees:read'] },
 *   beforeLoad: requirePermissions(['employees:read']),
 * });
 */
export function requirePermissions(required: readonly string[], mode: PermissionMode = 'all') {
  return (): void => {
    if (!currentUserCan(required, mode)) {
      throw redirect({ to: '/forbidden', replace: true });
    }
  };
}
