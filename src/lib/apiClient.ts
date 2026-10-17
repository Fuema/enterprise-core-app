import axios, { isAxiosError } from 'axios';
import { z } from 'zod';
import type { ApiResponse } from '@/types/generic-api';
import { ApiError } from './apiError';
import { authBridge } from './authBridge';
import { createCasingMapper } from './casing';
import { env } from './env';
import { resolveTenant } from './tenant';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Skip the 401 -> silent refresh -> retry pipeline (auth endpoints). */
    skipAuthRefresh?: boolean;
    /** Internal flag: request has already been replayed once after a refresh. */
    _retried?: boolean;
  }
}

/** Backend <-> app property casing, driven entirely by configuration. */
export const casing = createCasingMapper(env.VITE_API_PROPERTY_CASING);

/** Tenant resolved once from the subdomain or the first path segment. */
export const currentTenant = resolveTenant(
  { strategy: env.VITE_TENANT_STRATEGY, rootDomain: env.VITE_TENANT_ROOT_DOMAIN },
  window.location,
);

function tenantHeaders(): Record<string, string> {
  return currentTenant ? { [env.VITE_TENANT_HEADER_NAME]: currentTenant } : {};
}

function isJsonBody(data: unknown): boolean {
  if (Array.isArray(data)) return true;
  if (data === null || typeof data !== 'object') return false;
  const proto: unknown = Object.getPrototypeOf(data);
  return proto === Object.prototype || proto === null;
}

/**
 * Removes the optional `ApiResponse<T>` envelope (VITE_API_RESPONSE_ENVELOPE).
 * The value is still `unknown`-sourced JSON: validate it with a Zod schema
 * (see BaseApiService `schema` option) when the contract is not trusted.
 */
export function unwrapEnvelope<T>(body: unknown): T {
  if (!env.VITE_API_RESPONSE_ENVELOPE) return body as T;
  const envelope = body as ApiResponse<T>;
  if (!envelope.success) {
    throw new ApiError({
      status: 200,
      title: envelope.message ?? 'The server reported a failure',
      fieldErrors: envelope.errors,
    });
  }
  return envelope.data;
}

// ---------------------------------------------------------------------------
// Axios instances
// ---------------------------------------------------------------------------

/** Main HTTP client: auth header, tenant header, casing, error normalisation, silent refresh. */
export const apiClient = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  timeout: env.VITE_API_TIMEOUT_MS,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

/** Bare client for the refresh call: no interceptors, so it can never recurse. */
const refreshClient = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  timeout: env.VITE_API_TIMEOUT_MS,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

const refreshResponseSchema = z.object({ accessToken: z.string().min(1) });

let refreshInFlight: Promise<string> | null = null;

/**
 * Dual-token refresh: the refresh token lives in an httpOnly cookie (sent via
 * `withCredentials`), the new access token is kept in memory only.
 * Concurrent 401s share ONE refresh request (single-flight).
 */
export function refreshAccessToken(): Promise<string> {
  refreshInFlight ??= refreshClient
    .post<unknown>(env.VITE_AUTH_REFRESH_PATH, undefined, { headers: tenantHeaders() })
    .then((response) => {
      const body = unwrapEnvelope<unknown>(casing.fromApi(response.data));
      const { accessToken } = refreshResponseSchema.parse(body);
      authBridge().setAccessToken(accessToken);
      return accessToken;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

apiClient.interceptors.request.use((config) => {
  const token = authBridge().getAccessToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  for (const [name, value] of Object.entries(tenantHeaders())) config.headers.set(name, value);
  if (config.params !== undefined) config.params = casing.toApi(config.params);
  if (isJsonBody(config.data)) config.data = casing.toApi(config.data);
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    response.data = casing.fromApi(response.data);
    return response;
  },
  async (error: unknown) => {
    const config = isAxiosError(error) ? error.config : undefined;
    const isUnauthorized = isAxiosError(error) && error.response?.status === 401;

    if (isUnauthorized && config && !config.skipAuthRefresh && !config._retried) {
      config._retried = true;
      try {
        const token = await refreshAccessToken();
        config.headers.set('Authorization', `Bearer ${token}`);
        return await apiClient.request(config);
      } catch (retryError) {
        if (!(retryError instanceof ApiError) || retryError.isUnauthorized) {
          authBridge().onSessionExpired();
        }
        throw ApiError.from(retryError, casing.keyFromApi);
      }
    }

    throw ApiError.from(error, casing.keyFromApi);
  },
);
