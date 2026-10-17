import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.schema';

const valid = {
  VITE_APP_NAME: 'Test',
  VITE_API_BASE_URL: 'https://localhost:5001/api',
  VITE_API_TIMEOUT_MS: '30000',
  VITE_API_PROPERTY_CASING: 'pascal',
  VITE_API_RESPONSE_ENVELOPE: 'false',
  VITE_TENANT_STRATEGY: 'none',
  VITE_TENANT_HEADER_NAME: 'X-Tenant-ID',
  VITE_TENANT_ROOT_DOMAIN: '',
  VITE_AUTH_LOGIN_PATH: '/auth/login',
  VITE_AUTH_REFRESH_PATH: '/auth/refresh',
  VITE_AUTH_LOGOUT_PATH: '/auth/logout',
  VITE_AUTH_ME_PATH: '/auth/me',
  VITE_HUB_BASE_URL: '',
  VITE_HUB_MAX_RETRY_DELAY_MS: '30000',
  VITE_HUB_MAX_RETRIES: '10',
  VITE_QUERY_STALE_TIME_MS: '0',
  VITE_DEFAULT_PAGE_SIZE: '20',
  VITE_STORAGE_NAMESPACE: 'test',
};

describe('parseEnv', () => {
  it('parses and coerces a complete configuration', () => {
    const env = parseEnv(valid);
    expect(env.VITE_API_TIMEOUT_MS).toBe(30000);
    expect(env.VITE_API_RESPONSE_ENVELOPE).toBe(false);
    expect(env.VITE_HUB_BASE_URL).toBeUndefined();
    expect(env.VITE_TENANT_ROOT_DOMAIN).toBeUndefined();
  });

  it('fails fast when a variable is missing', () => {
    const { VITE_API_BASE_URL: _omitted, ...missing } = valid;
    expect(() => parseEnv(missing)).toThrow(/VITE_API_BASE_URL/);
  });

  it('rejects malformed values', () => {
    expect(() => parseEnv({ ...valid, VITE_API_PROPERTY_CASING: 'kebab' })).toThrow();
    expect(() => parseEnv({ ...valid, VITE_AUTH_LOGIN_PATH: 'auth/login' })).toThrow();
  });

  it('requires a root domain for the subdomain strategy', () => {
    expect(() => parseEnv({ ...valid, VITE_TENANT_STRATEGY: 'subdomain' })).toThrow(/VITE_TENANT_ROOT_DOMAIN/);
  });
});
