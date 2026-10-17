import { apiClient, refreshAccessToken, unwrapEnvelope } from '@/lib/apiClient';
import { env } from '@/lib/env';
import { queryClient } from '@/lib/queryClient';
import { searchMemory } from '@/lib/searchMemory';
import type { LoginRequest } from '../schemas/loginSchema';
import { useAuthStore } from '../store/authStore';
import { authUserSchema, loginResponseSchema, type AuthUser } from '../types/auth';

/** Loads the current principal using the access token already in the store. */
export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await apiClient.get<unknown>(env.VITE_AUTH_ME_PATH);
  return authUserSchema.parse(unwrapEnvelope(response.data));
}

/** Credential login. The server sets the httpOnly refresh cookie on success. */
export async function login(credentials: LoginRequest): Promise<AuthUser> {
  const response = await apiClient.post<unknown>(env.VITE_AUTH_LOGIN_PATH, credentials, { skipAuthRefresh: true });
  const { accessToken, user } = loginResponseSchema.parse(unwrapEnvelope(response.data));
  useAuthStore.getState().setAccessToken(accessToken);
  const principal = user ?? (await fetchCurrentUser());
  useAuthStore.getState().setSession(principal, accessToken);
  return principal;
}

/** Ends the session server-side (clears cookie) and wipes every client cache. */
export async function logout(): Promise<void> {
  try {
    await apiClient.post(env.VITE_AUTH_LOGOUT_PATH, undefined, { skipAuthRefresh: true });
  } finally {
    useAuthStore.getState().clearSession();
    queryClient.clear();
    searchMemory.clear();
  }
}

/**
 * Called once at startup: uses the refresh cookie to obtain a fresh access
 * token so a page reload does not log the user out. Never throws.
 */
export async function restoreSession(): Promise<boolean> {
  try {
    const accessToken = await refreshAccessToken();
    const user = await fetchCurrentUser();
    useAuthStore.getState().setSession(user, accessToken);
    return true;
  } catch {
    useAuthStore.getState().clearSession();
    return false;
  }
}
