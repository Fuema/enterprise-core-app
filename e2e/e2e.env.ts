/**
 * Environment for the end-to-end dev server. Passed as process variables,
 * which Vite gives priority over any .env file, so the suite is identical on
 * every machine and in CI regardless of local .env.development values.
 *
 * Keep in sync with src/lib/env.schema.ts (a missing key fails server start).
 */
export const E2E_PORT = 5174;

export const e2eEnv: Record<string, string> = {
  VITE_APP_NAME: 'Enterprise Core',
  // Never contacted: the MSW mock intercepts every API call in the browser.
  VITE_API_BASE_URL: 'https://api.e2e.test/api',
  VITE_API_TIMEOUT_MS: '30000',
  VITE_API_PROPERTY_CASING: 'camel',
  VITE_API_RESPONSE_ENVELOPE: 'false',
  VITE_TENANT_STRATEGY: 'none',
  VITE_TENANT_HEADER_NAME: 'X-Tenant-ID',
  VITE_TENANT_ROOT_DOMAIN: '',
  VITE_AUTH_LOGIN_PATH: '/auth/login',
  VITE_AUTH_REFRESH_PATH: '/auth/refresh',
  VITE_AUTH_LOGOUT_PATH: '/auth/logout',
  VITE_AUTH_ME_PATH: '/auth/me',
  VITE_AUTH_REGISTER_PATH: '/auth/register',
  VITE_AUTH_SIGNUP_ENABLED: 'true',
  VITE_HUB_BASE_URL: '',
  VITE_HUB_MAX_RETRY_DELAY_MS: '30000',
  VITE_HUB_MAX_RETRIES: '10',
  VITE_QUERY_STALE_TIME_MS: '30000',
  VITE_DEFAULT_PAGE_SIZE: '20',
  VITE_STORAGE_NAMESPACE: 'enterprise-core-e2e',
  VITE_ENABLE_MOCKS: 'true',
};
