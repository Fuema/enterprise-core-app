import { z } from 'zod';

/**
 * Single source of truth for every runtime configuration value.
 *
 * This module is imported by BOTH `vite.config.ts` (Node, build time) and
 * `src/lib/env.ts` (browser, runtime), so it must stay free of browser- or
 * Node-specific APIs.
 */

/** Treats an empty string (`VITE_X=`) as "not provided". */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const apiPath = z.string().startsWith('/', { message: 'Must be a path starting with "/"' });
const positiveInt = z.coerce.number().int().positive();

export const envSchema = z
  .object({
    // Application
    VITE_APP_NAME: z.string().min(1),

    // HTTP API
    VITE_API_BASE_URL: z.url(),
    VITE_API_TIMEOUT_MS: positiveInt,
    /** Casing the BACKEND uses on the wire. The app always works in camelCase. */
    VITE_API_PROPERTY_CASING: z.enum(['camel', 'pascal', 'snake', 'none']),
    /** true  -> responses are wrapped in ApiResponse<T>; false -> raw payloads. */
    VITE_API_RESPONSE_ENVELOPE: z.stringbool(),

    // Multi-tenancy
    VITE_TENANT_STRATEGY: z.enum(['subdomain', 'path', 'none']),
    VITE_TENANT_HEADER_NAME: z.string().min(1),
    /** Required for the subdomain strategy, e.g. "app.example.com". */
    VITE_TENANT_ROOT_DOMAIN: optional(z.string().min(1)),

    // Authentication (dual token: in-memory access token + httpOnly refresh cookie)
    VITE_AUTH_LOGIN_PATH: apiPath,
    VITE_AUTH_REFRESH_PATH: apiPath,
    VITE_AUTH_LOGOUT_PATH: apiPath,
    VITE_AUTH_ME_PATH: apiPath,

    // Real-time hub (optional; leave empty to disable)
    VITE_HUB_BASE_URL: optional(z.url()),
    VITE_HUB_MAX_RETRY_DELAY_MS: positiveInt,
    VITE_HUB_MAX_RETRIES: z.coerce.number().int().min(0),

    // Data layer
    VITE_QUERY_STALE_TIME_MS: z.coerce.number().int().min(0),
    VITE_DEFAULT_PAGE_SIZE: positiveInt,

    // Browser storage
    VITE_STORAGE_NAMESPACE: z.string().min(1),

    // Development: in-browser mock backend (MSW). Ignored outside `vite dev`.
    VITE_ENABLE_MOCKS: z.preprocess((value) => (value === '' ? undefined : value), z.stringbool().default(false)),
  })
  .superRefine((env, ctx) => {
    if (env.VITE_TENANT_STRATEGY === 'subdomain' && !env.VITE_TENANT_ROOT_DOMAIN) {
      ctx.addIssue({
        code: 'custom',
        path: ['VITE_TENANT_ROOT_DOMAIN'],
        message: 'Required when VITE_TENANT_STRATEGY is "subdomain"',
      });
    }
  });

export type AppEnv = z.output<typeof envSchema>;

/** Parses raw variables and throws a readable, aggregated error on failure. */
export function parseEnv(raw: unknown): AppEnv {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `\n\nInvalid or missing environment variables:\n${z.prettifyError(result.error)}\n` +
        'Copy .env.example to .env.local (or .env.<mode>) and fill in every value.\n',
    );
  }
  return result.data;
}
