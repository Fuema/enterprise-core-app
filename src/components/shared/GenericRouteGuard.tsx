import { Navigate, useLocation } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useAuthStore, usePermissions } from '@/features/auth/store/authStore';
import type { PermissionMode } from '@/lib/permissions';

export interface GenericRouteGuardProps {
  /** Scopes required to see the content. Empty = authentication only. */
  permissions?: readonly string[];
  mode?: PermissionMode;
  /** Rendered when authenticated but not authorised. Default: redirect to /forbidden. */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Reusable identity/permission gateway for a subtree.
 *
 * Prefer the router-level guards for whole routes (they run before any loader):
 *   beforeLoad: requireAuthentication          (see routes/_authenticated.tsx)
 *   beforeLoad: requirePermissions([...])      (features/auth/guards.ts)
 * Use this component when only PART of a page needs gating, or reactively
 * when permissions can change while the page is open.
 */
export function GenericRouteGuard({ permissions = [], mode = 'all', fallback, children }: GenericRouteGuardProps) {
  const location = useLocation();
  const authenticated = useAuthStore((state) => state.status === 'authenticated');
  const allowed = usePermissions(permissions, mode);

  if (!authenticated) {
    return <Navigate to="/login" search={{ redirect: location.href }} replace />;
  }
  if (!allowed) {
    return fallback === undefined ? <Navigate to="/forbidden" replace /> : <>{fallback}</>;
  }
  return <>{children}</>;
}
