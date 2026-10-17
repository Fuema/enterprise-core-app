/**
 * Access-control evaluation shared by GenericActionGuard, GenericRouteGuard
 * and `requirePermissions()`. Pure function, unit-tested.
 *
 * Supported grants:
 *   "employees:read"  exact scope
 *   "employees:*"     every scope under "employees"
 *   "*"               super-user
 *
 * Client-side checks only shape the UI. The API MUST enforce the same rules.
 */
export type PermissionMode = 'all' | 'any';

function grants(granted: ReadonlySet<string>, required: string): boolean {
  if (granted.has('*') || granted.has(required)) return true;
  const parts = required.split(':');
  for (let i = parts.length - 1; i > 0; i -= 1) {
    if (granted.has(`${parts.slice(0, i).join(':')}:*`)) return true;
  }
  return false;
}

export function hasPermissions(
  granted: readonly string[],
  required: readonly string[],
  mode: PermissionMode = 'all',
): boolean {
  if (required.length === 0) return true;
  const set = new Set(granted);
  return mode === 'all' ? required.every((r) => grants(set, r)) : required.some((r) => grants(set, r));
}
