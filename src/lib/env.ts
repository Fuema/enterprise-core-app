import { parseEnv } from './env.schema';

/**
 * Validated, strongly-typed runtime configuration.
 * Import `env` everywhere — never read `import.meta.env` directly.
 */
export const env = parseEnv(import.meta.env);

export type { AppEnv } from './env.schema';
