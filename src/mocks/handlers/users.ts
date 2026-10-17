import { delay, http } from 'msw';
import { z } from 'zod';
import { hasPermissions } from '@/lib/permissions';
import { PERMISSION_CATALOG, users, type MockUser } from '../db';
import { api, ok, problem, queryParam, readBody } from '../http';
import { listPage } from '../paging';
import { authorize } from './auth';

/**
 * Mock account administration, mirroring Endpoint/UserEndpoints.cs:
 *   GET /users?…&isActive=   users:read
 *   GET /users/permissions   users:read
 *   GET /users/:id           users:read
 *   PUT /users/:id           users:write (same validation, lock-out guards)
 */
const LATENCY_MS = 250;

const userInput = z.object({
  displayName: z.string().trim().min(1, 'Full name is required').max(100, 'Max 100 characters'),
  email: z.union([z.null(), z.literal(''), z.email('Enter a valid email address')]),
  roles: z.array(z.string()).max(10, 'At most 10 roles'),
  permissions: z.array(z.string()).max(50, 'At most 50 permissions'),
  isActive: z.boolean(),
});

const userDto = (u: MockUser) => ({
  id: u.id,
  username: u.username,
  displayName: u.displayName,
  email: u.email === '' ? null : u.email,
  roles: u.roles,
  permissions: u.permissions,
  isActive: u.isActive,
  createdAtUtc: u.createdAtUtc,
});

function isGrantable(value: string): boolean {
  if (value === '*' || PERMISSION_CATALOG.includes(value)) return true;
  if (!value.endsWith(':*')) return false;
  const resource = value.slice(0, -2);
  return PERMISSION_CATALOG.some((scope) => scope.startsWith(`${resource}:`));
}

const normalize = (values: readonly string[]) => [...new Set(values.map((v) => v.trim()).filter(Boolean))];

export const userHandlers = [
  http.get(api('/users'), async ({ request }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['users:read']);
    if (auth instanceof Response) return auth;
    const url = new URL(request.url);
    const isActive = queryParam(url, 'isActive');
    const rows = users
      .filter((u) => isActive === null || String(u.isActive) === isActive)
      .map((u) => ({ ...userDto(u), rolesText: u.roles.join(',') }));
    const page = listPage(rows, url, {
      sortable: ['id', 'username', 'displayName', 'email', 'isActive', 'createdAtUtc'],
      searchable: ['username', 'displayName', 'email', 'rolesText'],
      defaultSort: 'username',
    });
    return ok({ ...page, data: page.data.map(({ rolesText: _rolesText, ...dto }) => dto) });
  }),

  http.get(api('/users/permissions'), async ({ request }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['users:read']);
    if (auth instanceof Response) return auth;
    return ok({ scopes: PERMISSION_CATALOG });
  }),

  http.get(api('/users/:id'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['users:read']);
    if (auth instanceof Response) return auth;
    const user = users.find((u) => String(u.id) === String(params.id));
    return user ? ok(userDto(user)) : problem(404, 'User not found');
  }),

  http.put(api('/users/:id'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const caller = authorize(request, ['users:write']);
    if (caller instanceof Response) return caller;
    const user = users.find((u) => String(u.id) === String(params.id));
    if (!user) return problem(404, 'User not found');

    const parsed = userInput.safeParse(await readBody(request));
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'request');
        errors[key] = [...(errors[key] ?? []), issue.message];
      }
      return problem(400, 'One or more validation errors occurred.', errors);
    }

    const input = parsed.data;
    const email = input.email === null || input.email.trim() === '' ? '' : input.email.trim();
    const roles = normalize(input.roles);
    const permissions = normalize(input.permissions);
    const errors: Record<string, string[]> = {};

    const invalidRole = roles.find((r) => r.length > 50 || r.includes(','));
    if (invalidRole) errors.roles = [`Invalid role "${invalidRole}" (max 50 characters, no commas)`];
    const unknown = permissions.filter((p) => !isGrantable(p));
    if (unknown.length > 0) errors.permissions = [`Unknown permission: ${unknown.join(', ')}`];
    if (email && users.some((u) => u.id !== user.id && u.email.toLowerCase() === email.toLowerCase())) {
      errors.email = ['An account with this email already exists'];
    }
    const isSelf = caller.id === user.id;
    if (isSelf && !input.isActive) errors.isActive = ['You cannot deactivate your own account'];
    if (isSelf && !hasPermissions(permissions, ['users:write'])) {
      errors.permissions = ['You cannot remove your own users:write permission'];
    }
    if (Object.keys(errors).length > 0) return problem(400, 'One or more validation errors occurred.', errors);

    Object.assign(user, { displayName: input.displayName, email, roles, permissions, isActive: input.isActive });
    return ok(userDto(user));
  }),
];
