import type { ReactNode } from 'react';
import { usePermissions } from '@/features/auth/store/authStore';
import type { PermissionMode } from '@/lib/permissions';

export interface GenericActionGuardProps {
  /** Access-control scopes, e.g. ['employees:delete']. */
  permissions: readonly string[];
  /** 'all' (default): every scope required. 'any': at least one. */
  mode?: PermissionMode;
  /** Rendered when access is denied (e.g. a disabled button). Default: nothing. */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Component-level permission gate for granular UI (a Delete button, an Edit tab).
 * Subscribes to the Zustand auth store through a boolean selector, so it only
 * re-renders when the decision flips.
 *
 * UX only: the API must enforce the same permission.
 *
 * @example
 * <GenericActionGuard permissions={['employees:delete']}>
 *   <Button variant="destructive">Delete</Button>
 * </GenericActionGuard>
 */
export function GenericActionGuard({ permissions, mode = 'all', fallback = null, children }: GenericActionGuardProps) {
  const allowed = usePermissions(permissions, mode);
  return <>{allowed ? children : fallback}</>;
}
