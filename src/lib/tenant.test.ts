import { describe, expect, it } from 'vitest';
import { resolveBasepath, resolveTenant } from './tenant';

const at = (hostname: string, pathname = '/') => ({ hostname, pathname });

describe('resolveTenant', () => {
  it('returns undefined for the none strategy', () => {
    expect(resolveTenant({ strategy: 'none' }, at('acme.app.example.com'))).toBeUndefined();
  });

  it('reads the label in front of the root domain', () => {
    const config = { strategy: 'subdomain', rootDomain: 'app.example.com' } as const;
    expect(resolveTenant(config, at('acme.app.example.com'))).toBe('acme');
    expect(resolveTenant(config, at('ACME.App.Example.com'))).toBe('acme');
    expect(resolveTenant(config, at('app.example.com'))).toBeUndefined();
    expect(resolveTenant(config, at('evil-example.com'))).toBeUndefined();
  });

  it('reads the first path segment', () => {
    const config = { strategy: 'path' } as const;
    expect(resolveTenant(config, at('host', '/acme/employees'))).toBe('acme');
    expect(resolveTenant(config, at('host', '/'))).toBeUndefined();
    expect(resolveTenant(config, at('host', '/bad%20name/x'))).toBeUndefined();
  });
});

describe('resolveBasepath', () => {
  it('uses the tenant segment only for the path strategy', () => {
    expect(resolveBasepath({ strategy: 'path' }, at('host', '/acme/x'))).toBe('/acme');
    expect(resolveBasepath({ strategy: 'none' }, at('host', '/acme/x'))).toBe('/');
  });
});
