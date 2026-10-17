/// <reference types="vite/client" />

// Raw variable names are declared for editor completion only. Application code
// must consume the validated `env` object from `@/lib/env`.
interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_TIMEOUT_MS: string;
  readonly VITE_API_PROPERTY_CASING: string;
  readonly VITE_API_RESPONSE_ENVELOPE: string;
  readonly VITE_TENANT_STRATEGY: string;
  readonly VITE_TENANT_HEADER_NAME: string;
  readonly VITE_TENANT_ROOT_DOMAIN?: string;
  readonly VITE_AUTH_LOGIN_PATH: string;
  readonly VITE_AUTH_REFRESH_PATH: string;
  readonly VITE_AUTH_LOGOUT_PATH: string;
  readonly VITE_AUTH_ME_PATH: string;
  readonly VITE_HUB_BASE_URL?: string;
  readonly VITE_HUB_MAX_RETRY_DELAY_MS: string;
  readonly VITE_HUB_MAX_RETRIES: string;
  readonly VITE_QUERY_STALE_TIME_MS: string;
  readonly VITE_DEFAULT_PAGE_SIZE: string;
  readonly VITE_STORAGE_NAMESPACE: string;
  readonly VITE_ENABLE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
