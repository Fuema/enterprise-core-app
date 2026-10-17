import { create } from 'zustand';
import { hasPermissions, type PermissionMode } from '@/lib/permissions';
import type { AuthUser, SessionStatus } from '../types/auth';

interface AuthState {
  user: AuthUser | null;
  /** In-memory only. Never written to localStorage/sessionStorage. */
  accessToken: string | null;
  status: SessionStatus;
  setSession: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  status: 'unknown',
  setSession: (user, accessToken) => set({ user, accessToken, status: 'authenticated' }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearSession: () => set({ user: null, accessToken: null, status: 'anonymous' }),
}));

// ---------------------------------------------------------------------------
// Selectors / non-React accessors (safe to call from router `beforeLoad`).
// ---------------------------------------------------------------------------

export function isAuthenticated(): boolean {
  const { status, user } = useAuthStore.getState();
  return status === 'authenticated' && user !== null;
}

export function currentUserCan(required: readonly string[], mode: PermissionMode = 'all'): boolean {
  const { user } = useAuthStore.getState();
  return user !== null && hasPermissions(user.permissions, required, mode);
}

/**
 * Reactive permission check. Returns a boolean, so components re-render only
 * when the outcome flips, not on every store change.
 */
export function usePermissions(required: readonly string[], mode: PermissionMode = 'all'): boolean {
  return useAuthStore((state) => state.user !== null && hasPermissions(state.user.permissions, required, mode));
}
