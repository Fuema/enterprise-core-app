import { registerAuthBridge } from '@/lib/authBridge';
import { reloadPrincipal } from './services/authService';
import { useAuthStore } from './store/authStore';

export { LoginForm } from './components/LoginForm';
export { SessionList } from './components/SessionList';
export { describeUserAgent } from './utils/userAgent';
export { SignupForm } from './components/SignupForm';
export { useChangePassword, useLogin, useLogout, useSignup } from './hooks/useLogin';
export { ChangePasswordForm } from './components/ChangePasswordForm';
export { changePasswordSchema, type ChangePasswordRequest } from './schemas/changePasswordSchema';
export { loginSchema, type LoginRequest } from './schemas/loginSchema';
export { signupSchema, type SignupRequest } from './schemas/signupSchema';
export {
  changePassword,
  fetchCurrentUser,
  fetchMySessions,
  login,
  logout,
  register,
  reloadPrincipal,
  restoreSession,
  revokeMySession,
} from './services/authService';
export { useAuthStore, isAuthenticated, currentUserCan, usePermissions } from './store/authStore';
export type { AuthUser, Session, SessionStatus } from './types/auth';

/**
 * Connects the generic HTTP/hub engines to this auth implementation.
 * `onSessionExpired` is supplied by the composition root (main.tsx) so the
 * auth feature never imports the router (avoids a circular dependency).
 */
export function initializeAuth(options: { onSessionExpired: () => void; onAccessChanged?: () => void }): void {
  registerAuthBridge({
    getAccessToken: () => useAuthStore.getState().accessToken ?? undefined,
    setAccessToken: (token) => useAuthStore.getState().setAccessToken(token),
    onSessionExpired: () => {
      useAuthStore.getState().clearSession();
      options.onSessionExpired();
    },
    // A silent refresh may carry new permissions (the server rejects tokens whose
    // access changed): reload the principal and re-run route guards if it changed.
    onAccessTokenRefreshed: () => {
      void reloadPrincipal()
        .then((changed) => {
          if (changed) options.onAccessChanged?.();
        })
        .catch(() => undefined);
    },
  });
}
