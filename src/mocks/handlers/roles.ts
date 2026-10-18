import { delay, http } from 'msw';
import { z } from 'zod';
import { isGrantable, nextId, recordAudit, roles, users, type MockRole } from '../db';
import { api, noContent, ok, problem, readBody } from '../http';
import { listPage } from '../paging';
import { authorize } from './auth';

/** Mock roles resource, mirroring Endpoint/RoleEndpoints.cs (system role locked, 409 while assigned). */
const LATENCY_MS = 250;
const VALIDATION = 'One or more validation errors occurred.';

const roleInput = z.object({
  name: z.string().trim().min(1, 'Name is required').max(64, 'Max 64 characters').refine((v) => !v.includes(','), 'Commas are not allowed'),
  description: z.string().max(200, 'Max 200 characters').nullable(),
  permissions: z.array(z.string()).max(60, 'At most 60 permissions'),
});

const membersOf = (role: MockRole) => users.filter((u) => u.roleIds.includes(role.id));

const listDto = (role: MockRole) => ({
  id: role.id,
  name: role.name,
  description: role.description,
  isSystem: role.isSystem,
  userCount: membersOf(role).length,
  permissionCount: role.permissions.length,
  permissions: [...role.permissions].sort(),
  createdAtUtc: role.createdAtUtc,
  updatedAtUtc: role.updatedAtUtc,
});

const detailDto = (role: MockRole) => ({
  ...listDto(role),
  members: membersOf(role)
    .sort((a, b) => a.username.localeCompare(b.username))
    .map((u) => ({ id: u.id, username: u.username, displayName: u.displayName, isActive: u.isActive })),
});

const conflict = (title: string, detail: string) =>
  new Response(JSON.stringify({ type: 'https://httpstatuses.io/409', title, status: 409, detail }), {
    status: 409,
    headers: { 'Content-Type': 'application/problem+json' },
  });

function parse(body: unknown): { name: string; description: string | null; permissions: string[] } | Response {
  const parsed = roleInput.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'request');
      errors[key] = [...(errors[key] ?? []), issue.message];
    }
    return problem(400, VALIDATION, errors);
  }
  const description = parsed.data.description?.trim() ?? '';
  return {
    name: parsed.data.name,
    description: description === '' ? null : description,
    permissions: [...new Set(parsed.data.permissions.map((p) => p.trim()).filter(Boolean))],
  };
}

const findRole = (id: unknown) => roles.find((r) => String(r.id) === String(id));
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const roleHandlers = [
  http.get(api('/roles'), async ({ request }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['roles:read']);
    if (auth instanceof Response) return auth;
    return ok(
      listPage(roles.map((r) => ({ ...listDto(r), descriptionText: r.description ?? '' })), new URL(request.url), {
        sortable: ['id', 'name', 'userCount', 'permissionCount', 'createdAtUtc'],
        searchable: ['name', 'descriptionText'],
        defaultSort: 'name',
      }),
    );
  }),

  http.get(api('/roles/:id'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['roles:read']);
    if (auth instanceof Response) return auth;
    const role = findRole(params.id);
    return role ? ok(detailDto(role)) : problem(404, 'Role not found');
  }),

  http.post(api('/roles'), async ({ request }) => {
    await delay(LATENCY_MS);
    const caller = authorize(request, ['roles:write']);
    if (caller instanceof Response) return caller;
    const input = parse(await readBody(request));
    if (input instanceof Response) return input;
    const errors: Record<string, string[]> = {};
    if (roles.some((r) => sameName(r.name, input.name))) errors.name = ['A role with this name already exists'];
    const unknown = input.permissions.filter((p) => !isGrantable(p));
    if (unknown.length > 0) errors.permissions = [`Unknown permission: ${unknown.join(', ')}`];
    if (Object.keys(errors).length > 0) return problem(400, VALIDATION, errors);
    const role: MockRole = { id: nextId(roles), ...input, isSystem: false, createdAtUtc: new Date().toISOString(), updatedAtUtc: null };
    roles.push(role);
    recordAudit({ action: 'role.created', targetType: 'role', targetId: String(role.id), targetName: role.name, details: { permissions: role.permissions }, actorUserId: caller.id, actorName: caller.displayName });
    return ok(detailDto(role), 201);
  }),

  http.put(api('/roles/:id'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const caller = authorize(request, ['roles:write']);
    if (caller instanceof Response) return caller;
    const role = findRole(params.id);
    if (!role) return problem(404, 'Role not found');
    const input = parse(await readBody(request));
    if (input instanceof Response) return input;

    const errors: Record<string, string[]> = {};
    const samePermissions =
      input.permissions.length === role.permissions.length && input.permissions.every((p) => role.permissions.includes(p));
    if (role.isSystem) {
      if (input.name !== role.name) errors.name = ['System roles cannot be renamed'];
      if (!samePermissions) errors.permissions = ['The Administrator role always has every permission'];
    } else if (roles.some((r) => r.id !== role.id && sameName(r.name, input.name))) {
      errors.name = ['A role with this name already exists'];
    }
    const unknown = input.permissions.filter((p) => !isGrantable(p));
    if (unknown.length > 0) errors.permissions = [`Unknown permission: ${unknown.join(', ')}`];
    if (Object.keys(errors).length > 0) return problem(400, VALIDATION, errors);

    Object.assign(role, { ...input, updatedAtUtc: new Date().toISOString() });
    recordAudit({ action: 'role.updated', targetType: 'role', targetId: String(role.id), targetName: role.name, details: { changes: input }, actorUserId: caller.id, actorName: caller.displayName });
    return ok(detailDto(role));
  }),

  http.delete(api('/roles/:id'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const caller = authorize(request, ['roles:delete']);
    if (caller instanceof Response) return caller;
    const role = findRole(params.id);
    if (!role) return problem(404, 'Role not found');
    if (role.isSystem) return conflict('System role', `${role.name} is a system role and cannot be deleted.`);
    const members = membersOf(role).length;
    if (members > 0) {
      return conflict('Role is in use', `${role.name} is assigned to ${String(members)} user${members === 1 ? '' : 's'}. Remove it from them first.`);
    }
    roles.splice(roles.indexOf(role), 1);
    recordAudit({ action: 'role.deleted', targetType: 'role', targetId: String(role.id), targetName: role.name, actorUserId: caller.id, actorName: caller.displayName });
    return noContent();
  }),
];
