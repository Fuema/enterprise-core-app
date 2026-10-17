/**
 * Pure helpers for the permission editor (unit-tested). Grants are flat
 * scopes ("countries:read"), resource wildcards ("countries:*") or "*",
 * exactly as stored by the API.
 */

export interface PermissionResource {
  /** "countries" */
  resource: string;
  /** Actions in catalog order: ["read", "write", "delete"]. */
  actions: string[];
}

/** Groups catalog scopes by resource, preserving catalog order. */
export function groupCatalog(scopes: readonly string[]): PermissionResource[] {
  const groups = new Map<string, string[]>();
  for (const scope of scopes) {
    const separator = scope.lastIndexOf(':');
    if (separator <= 0) continue;
    const resource = scope.slice(0, separator);
    const action = scope.slice(separator + 1);
    groups.set(resource, [...(groups.get(resource) ?? []), action]);
  }
  return [...groups].map(([resource, actions]) => ({ resource, actions }));
}

export function isSuperUser(granted: readonly string[]): boolean {
  return granted.includes('*');
}

export function hasWildcard(granted: readonly string[], resource: string): boolean {
  return granted.includes(`${resource}:*`);
}

/** Effective check (same rules as lib/permissions): exact, resource wildcard or "*". */
export function grants(granted: readonly string[], resource: string, action: string): boolean {
  return isSuperUser(granted) || hasWildcard(granted, resource) || granted.includes(`${resource}:${action}`);
}

/** Toggles one action; a wildcard is expanded to explicit scopes first, so unticking one action works. */
export function toggleAction(granted: readonly string[], group: PermissionResource, action: string): string[] {
  let next = [...granted];
  if (hasWildcard(next, group.resource)) {
    next = next.filter((g) => g !== `${group.resource}:*`);
    next.push(...group.actions.map((a) => `${group.resource}:${a}`));
  }
  const scope = `${group.resource}:${action}`;
  next = next.includes(scope) ? next.filter((g) => g !== scope) : [...next, scope];
  return dedupe(next);
}

/** "All" for a resource: replaces its explicit scopes with "<resource>:*" (or removes everything). */
export function toggleResource(granted: readonly string[], group: PermissionResource): string[] {
  const prefix = `${group.resource}:`;
  const without = granted.filter((g) => !g.startsWith(prefix));
  return hasWildcard(granted, group.resource) ? without : dedupe([...without, `${group.resource}:*`]);
}

export function toggleSuperUser(granted: readonly string[]): string[] {
  return isSuperUser(granted) ? granted.filter((g) => g !== '*') : dedupe([...granted, '*']);
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}
