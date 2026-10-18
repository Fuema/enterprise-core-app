import { delay, http } from 'msw';
import { z } from 'zod';
import { hasPermissions } from '@/lib/permissions';
import {
  effectivePermissions,
  isGrantable,
  nextId,
  recordAudit,
  roles,
  rolesOf,
  users,
  type MockRole,
  type MockUser,
} from '../db';
import { api, noContent, ok, problem, queryParam, readBody } from '../http';
import { listPage } from '../paging';
import { authorize, revokeSessionsOf, sessionsOf } from './auth';

/**
 * Mock account administration, mirroring Endpoint/UserEndpoints.cs (routes, permissions,
 * validation messages, lock-out and last-Administrator guards, temporary passwords).
 */
const LATENCY_MS = 250;
const VALIDATION = 'One or more validation errors occurred.';

const roleRef = (role: MockRole) => ({ id: role.id, name: role.name, isSystem: role.isSystem });

const listDto = (u: MockUser) => ({
  id: u.id,
  username: u.username,
  displayName: u.displayName,
  email: u.email === '' ? null : u.email,
  isActive: u.isActive,
  lockoutEndUtc: u.lockoutEndUtc,
  mustChangePassword: u.mustChangePassword,
  lastLoginAtUtc: u.lastLoginAtUtc,
  createdAtUtc: u.createdAtUtc,
  roles: rolesOf(u).map(roleRef),
  directPermissionCount: u.directPermissions.length,
});

const detailDto = (u: MockUser) => ({
  ...listDto(u),
  failedLoginCount: u.failedLoginCount,
  passwordChangedAtUtc: u.passwordChangedAtUtc,
  directPermissions: [...u.directPermissions].sort(),
  effectivePermissions: effectivePermissions(u),
});

const email = z.union([z.null(), z.literal(''), z.email('Enter a valid email address')]);
const base = {
  displayName: z.string().trim().min(1, 'Full name is required').max(100, 'Max 100 characters'),
  email,
  roleIds: z.array(z.number().int()).max(20, 'At most 20 roles'),
  directPermissions: z.array(z.string()).max(50, 'At most 50 permissions'),
};
const updateInput = z.object({ ...base, isActive: z.boolean() });
const createInput = z.object({
  ...base,
  username: z
    .string()
    .trim()
    .min(3, 'Use 3 to 64 characters')
    .max(64, 'Use 3 to 64 characters')
    .regex(/^[A-Za-z0-9._-]+$/, 'Use letters, digits, dots, dashes or underscores'),
});

function zodErrors(error: z.ZodError): Response {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'request');
    errors[key] = [...(errors[key] ?? []), issue.message];
  }
  return problem(400, VALIDATION, errors);
}

const normalize = (values: readonly string[]) => [...new Set(values.map((v) => v.trim()).filter(Boolean))];
const normalizeEmail = (value: string | null) => (value === null || value.trim() === '' ? '' : value.trim());

/** Same generator rules as PasswordPolicy.GenerateTemporary (always strong). */
function temporaryPassword(): string {
  const pick = (chars: string) => chars.charAt(Math.floor(Math.random() * chars.length));
  const all = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return pick('ABCDEFGHJKLMNPQRSTUVWXYZ') + pick('abcdefghijkmnpqrstuvwxyz') + pick('23456789') + Array.from({ length: 11 }, () => pick(all)).join('');
}

function commonErrors(input: { roleIds: number[]; directPermissions: string[] }, errors: Record<string, string[]>): MockRole[] {
  const ids = [...new Set(input.roleIds)];
  const selected = roles.filter((role) => ids.includes(role.id));
  if (selected.length !== ids.length) errors.roleIds = ['One or more roles no longer exist'];
  const unknown = normalize(input.directPermissions).filter((p) => !isGrantable(p));
  if (unknown.length > 0) errors.directPermissions = [`Unknown permission: ${unknown.join(', ')}`];
  return selected;
}

const isAdministrator = (role: MockRole) => role.isSystem && role.name === 'Administrator';
const findUser = (id: unknown) => users.find((u) => String(u.id) === String(id));

export const userHandlers = [
  http.get(api('/users'), async ({ request }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['users:read']);
    if (auth instanceof Response) return auth;
    const url = new URL(request.url);
    const isActive = queryParam(url, 'isActive');
    const roleId = Number(queryParam(url, 'roleId') ?? 0);
    const rows = users
      .filter((u) => isActive === null || String(u.isActive) === isActive)
      .filter((u) => roleId <= 0 || u.roleIds.includes(roleId))
      .map((u) => ({ ...listDto(u), roleNames: rolesOf(u).map((r) => r.name).join(',') }));
    const page = listPage(rows, url, {
      sortable: ['id', 'username', 'displayName', 'email', 'isActive', 'lastLoginAtUtc', 'createdAtUtc'],
      searchable: ['username', 'displayName', 'email', 'roleNames'],
      defaultSort: 'username',
    });
    return ok({ ...page, data: page.data.map(({ roleNames: _roleNames, ...dto }) => dto) });
  }),

  http.get(api('/users/role-options'), async ({ request }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['users:read']);
    if (auth instanceof Response) return auth;
    const sorted = [...roles].sort((a, b) => Number(b.isSystem) - Number(a.isSystem) || a.name.localeCompare(b.name));
    return ok(sorted.map((r) => ({ id: r.id, name: r.name, isSystem: r.isSystem, permissions: r.permissions })));
  }),

  http.get(api('/users/:id/sessions'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const caller = authorize(request, ['users:read']);
    if (caller instanceof Response) return caller;
    const user = findUser(params.id);
    return user ? ok(sessionsOf(user.id, caller.id)) : problem(404, 'User not found');
  }),

  http.get(api('/users/:id'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['users:read']);
    if (auth instanceof Response) return auth;
    const user = findUser(params.id);
    return user ? ok(detailDto(user)) : problem(404, 'User not found');
  }),

  http.post(api('/users'), async ({ request }) => {
    await delay(LATENCY_MS);
    const caller = authorize(request, ['users:write']);
    if (caller instanceof Response) return caller;
    const parsed = createInput.safeParse(await readBody(request));
    if (!parsed.success) return zodErrors(parsed.error);
    const input = parsed.data;
    const errors: Record<string, string[]> = {};
    const mail = normalizeEmail(input.email);
    if (users.some((u) => u.username.toLowerCase() === input.username.toLowerCase())) errors.username = ['This username is already taken'];
    if (mail && users.some((u) => u.email.toLowerCase() === mail.toLowerCase())) errors.email = ['An account with this email already exists'];
    const selected = commonErrors(input, errors);
    if (Object.keys(errors).length > 0) return problem(400, VALIDATION, errors);

    const password = temporaryPassword();
    const user: MockUser = {
      id: nextId(users),
      username: input.username,
      password,
      displayName: input.displayName,
      email: mail,
      roleIds: selected.map((r) => r.id),
      directPermissions: normalize(input.directPermissions),
      isActive: true,
      createdAtUtc: new Date().toISOString(),
      failedLoginCount: 0,
      lockoutEndUtc: null,
      mustChangePassword: true,
      lastLoginAtUtc: null,
      passwordChangedAtUtc: null,
    };
    users.push(user);
    recordAudit({
      action: 'user.created',
      targetType: 'user',
      targetId: String(user.id),
      targetName: user.username,
      details: { roles: selected.map((r) => r.name), directPermissions: user.directPermissions },
      actorUserId: caller.id,
      actorName: caller.displayName,
    });
    return ok({ user: detailDto(user), temporaryPassword: password }, 201);
  }),

  http.put(api('/users/:id'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const caller = authorize(request, ['users:write']);
    if (caller instanceof Response) return caller;
    const user = findUser(params.id);
    if (!user) return problem(404, 'User not found');
    const parsed = updateInput.safeParse(await readBody(request));
    if (!parsed.success) return zodErrors(parsed.error);

    const input = parsed.data;
    const errors: Record<string, string[]> = {};
    const mail = normalizeEmail(input.email);
    if (mail && users.some((u) => u.id !== user.id && u.email.toLowerCase() === mail.toLowerCase())) {
      errors.email = ['An account with this email already exists'];
    }
    const selected = commonErrors(input, errors);
    const grants = normalize(input.directPermissions);
    const isSelf = caller.id === user.id;
    if (isSelf && !input.isActive) errors.isActive = ['You cannot deactivate your own account'];
    if (isSelf && Object.keys(errors).length === 0) {
      const effective = [...selected.flatMap((r) => r.permissions), ...grants];
      if (!hasPermissions(effective, ['users:write'])) errors.directPermissions = ['You cannot remove your own users:write permission'];
    }
    const wasAdmin = user.isActive && rolesOf(user).some(isAdministrator);
    const staysAdmin = input.isActive && selected.some(isAdministrator);
    if (wasAdmin && !staysAdmin && Object.keys(errors).length === 0) {
      const otherAdmins = users.filter((u) => u.id !== user.id && u.isActive && rolesOf(u).some(isAdministrator));
      if (otherAdmins.length === 0) errors.roleIds = ['At least one active user must keep the Administrator role'];
    }
    if (Object.keys(errors).length > 0) return problem(400, VALIDATION, errors);

    const deactivated = user.isActive && !input.isActive;
    Object.assign(user, {
      displayName: input.displayName,
      email: mail,
      roleIds: selected.map((r) => r.id),
      directPermissions: grants,
      isActive: input.isActive,
    });
    if (deactivated) revokeSessionsOf(user.id);
    recordAudit({ action: 'user.updated', targetType: 'user', targetId: String(user.id), targetName: user.username, details: { changes: input }, actorUserId: caller.id, actorName: caller.displayName });
    return ok(detailDto(user));
  }),

  http.post(api('/users/:id/reset-password'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const caller = authorize(request, ['users:write']);
    if (caller instanceof Response) return caller;
    const user = findUser(params.id);
    if (!user) return problem(404, 'User not found');
    if (user.id === caller.id) {
      return new Response(
        JSON.stringify({ title: 'Use change password', status: 409, detail: 'To change your own password, use your account page.' }),
        { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
      );
    }
    const password = temporaryPassword();
    Object.assign(user, { password, mustChangePassword: true, failedLoginCount: 0, lockoutEndUtc: null });
    revokeSessionsOf(user.id);
    recordAudit({ action: 'user.password_reset', targetType: 'user', targetId: String(user.id), targetName: user.username, actorUserId: caller.id, actorName: caller.displayName });
    return ok({ temporaryPassword: password });
  }),

  http.post(api('/users/:id/unlock'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const caller = authorize(request, ['users:write']);
    if (caller instanceof Response) return caller;
    const user = findUser(params.id);
    if (!user) return problem(404, 'User not found');
    Object.assign(user, { failedLoginCount: 0, lockoutEndUtc: null });
    recordAudit({ action: 'user.unlocked', targetType: 'user', targetId: String(user.id), targetName: user.username, actorUserId: caller.id, actorName: caller.displayName });
    return noContent();
  }),

  http.delete(api('/users/:id/sessions/:sessionId'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const caller = authorize(request, ['users:write']);
    if (caller instanceof Response) return caller;
    const user = findUser(params.id);
    if (!user) return problem(404, 'User not found');
    revokeSessionsOf(user.id);
    recordAudit({ action: 'user.sessions_revoked', targetType: 'user', targetId: String(user.id), targetName: user.username, details: { sessions: 1 }, actorUserId: caller.id, actorName: caller.displayName });
    return noContent();
  }),

  http.delete(api('/users/:id/sessions'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const caller = authorize(request, ['users:write']);
    if (caller instanceof Response) return caller;
    const user = findUser(params.id);
    if (!user) return problem(404, 'User not found');
    revokeSessionsOf(user.id);
    recordAudit({ action: 'user.sessions_revoked', targetType: 'user', targetId: String(user.id), targetName: user.username, actorUserId: caller.id, actorName: caller.displayName });
    return noContent();
  }),
];
