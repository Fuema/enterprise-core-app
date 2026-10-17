/**
 * Multi-tenant context resolution.
 *  - subdomain: acme.app.example.com  (root domain "app.example.com") -> "acme"
 *  - path:      https://host/acme/... -> "acme"; the router uses "/acme" as its basepath
 *  - none:      single-tenant deployment
 * Pure module: accepts the location instead of reading `window` directly.
 */

export type TenantStrategy = 'subdomain' | 'path' | 'none';

export interface TenantConfig {
  strategy: TenantStrategy;
  rootDomain?: string;
}

export interface LocationLike {
  hostname: string;
  pathname: string;
}

const TENANT_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,62}$/;

export function resolveTenant(config: TenantConfig, location: LocationLike): string | undefined {
  switch (config.strategy) {
    case 'none':
      return undefined;
    case 'subdomain': {
      const root = config.rootDomain?.toLowerCase();
      const host = location.hostname.toLowerCase();
      if (!root || host === root || !host.endsWith(`.${root}`)) return undefined;
      const label = host.slice(0, -(root.length + 1)).split('.').pop();
      return label && TENANT_PATTERN.test(label) ? label : undefined;
    }
    case 'path': {
      const segment = location.pathname.split('/').find((part) => part.length > 0);
      return segment && TENANT_PATTERN.test(segment) ? segment : undefined;
    }
  }
}

/** Router basepath for the path strategy ("/acme"), otherwise "/". */
export function resolveBasepath(config: TenantConfig, location: LocationLike): string {
  if (config.strategy !== 'path') return '/';
  const tenant = resolveTenant(config, location);
  return tenant ? `/${tenant}` : '/';
}
