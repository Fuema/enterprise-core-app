import { describe, expect, it } from 'vitest';
import { grants, groupCatalog, toggleAction, toggleResource, toggleSuperUser } from './permissionMatrix';

const catalog = ['employees:read', 'employees:write', 'employees:delete', 'users:read', 'users:write'];

describe('permissionMatrix', () => {
  it('groups the catalog by resource in order', () => {
    expect(groupCatalog(catalog)).toEqual([
      { resource: 'employees', actions: ['read', 'write', 'delete'] },
      { resource: 'users', actions: ['read', 'write'] },
    ]);
  });

  it('evaluates exact scopes, resource wildcards and super-user', () => {
    expect(grants(['employees:read'], 'employees', 'read')).toBe(true);
    expect(grants(['employees:read'], 'employees', 'write')).toBe(false);
    expect(grants(['employees:*'], 'employees', 'delete')).toBe(true);
    expect(grants(['*'], 'users', 'write')).toBe(true);
  });

  it('unticking one action of a wildcard expands it to the remaining scopes', () => {
    const [employees] = groupCatalog(catalog);
    if (!employees) throw new Error('missing group');
    expect(toggleAction(['employees:*'], employees, 'delete')).toEqual(['employees:read', 'employees:write']);
    expect(toggleAction([], employees, 'read')).toEqual(['employees:read']);
  });

  it('"All" switches a resource between its wildcard and nothing', () => {
    const [employees] = groupCatalog(catalog);
    if (!employees) throw new Error('missing group');
    expect(toggleResource(['employees:read', 'users:read'], employees)).toEqual(['users:read', 'employees:*']);
    expect(toggleResource(['employees:*', 'users:read'], employees)).toEqual(['users:read']);
  });

  it('toggles the super-user grant', () => {
    expect(toggleSuperUser(['users:read'])).toEqual(['users:read', '*']);
    expect(toggleSuperUser(['users:read', '*'])).toEqual(['users:read']);
  });
});
