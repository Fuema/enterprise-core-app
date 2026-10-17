import { registerAuthBridge } from '@/lib/authBridge';
import { useAuthStore } from './store/authStore';

export { LoginForm } from './components/LoginForm';
export { SignupForm } from './components/SignupForm';
export { useLogin, useLogout, useSignup } from './hooks/useLogin';
export { loginSchema, type LoginRequest } from './schemas/loginSchema';
export { signupSchema, type SignupRequest } from './schemas/signupSchema';
export { login, logout, register, restoreSession, fetchCurrentUser } from './services/authService';
export { useAuthStore, isAuthenticated, currentUserCan, usePermissions } from './store/authStore';
export type { AuthUser, SessionStatus } from './types/auth';

/**
 * Connects the generic HTTP/hub engines to this auth implementation.
 * `onSessionExpired` is supplied by the composition root (main.tsx) so the
 * auth feature never imports the router (avoids a circular dependency).
 */
export function initializeAuth(options: { onSessionExpired: () => void }): void {
  registerAuthBridge({
    getAccessToken: () => useAuthStore.getState().accessToken ?? undefined,
    setAccessToken: (token) => useAuthStore.getState().setAccessToken(token),
    onSessionExpired: () => {
      useAuthStore.getState().clearSession();
      options.onSessionExpired();
    },
  });
}
