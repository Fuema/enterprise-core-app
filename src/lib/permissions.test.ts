import { describe, expect, it } from 'vitest';
import { hasPermissions } from './permissions';

describe('hasPermissions', () => {
  it('allows when nothing is required', () => {
    expect(hasPermissions([], [])).toBe(true);
  });

  it('matches exact scopes', () => {
    expect(hasPermissions(['employees:read'], ['employees:read'])).toBe(true);
    expect(hasPermissions(['employees:read'], ['employees:delete'])).toBe(false);
  });

  it('supports wildcards', () => {
    expect(hasPermissions(['employees:*'], ['employees:delete'])).toBe(true);
    expect(hasPermissions(['hr:*'], ['hr:employees:delete'])).toBe(true);
    expect(hasPermissions(['*'], ['anything:at:all'])).toBe(true);
    expect(hasPermissions(['employees:*'], ['payroll:read'])).toBe(false);
  });

  it('honours all/any modes', () => {
    const granted = ['employees:read'];
    expect(hasPermissions(granted, ['employees:read', 'employees:write'], 'all')).toBe(false);
    expect(hasPermissions(granted, ['employees:read', 'employees:write'], 'any')).toBe(true);
  });
});
