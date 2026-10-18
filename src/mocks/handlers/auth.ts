import { delay, http } from 'msw';
import { env } from '@/lib/env';
import { hasPermissions } from '@/lib/permissions';
import {
  SECURITY,
  SIGNUP_DEFAULT_ROLE,
  effectivePermissions,
  isLockedOut,
  nextId,
  recordAudit,
  roles,
  rolesOf,
  users,
  type MockUser,
} from '../db';
import { api, noContent, ok, problem, readBody } from '../http';

/**
 * Mock auth server implementing the template's dual-token contract:
 *  - access token: short-lived (ACCESS_TOKEN_TTL_MS) so the silent refresh
 *    path in apiClient is exercised within a minute of using the app
 *  - refresh "cookie": simulated in sessionStorage (a service worker cannot
 *    create real httpOnly cookies), so a page reload keeps you signed in
 */
const ACCESS_TOKEN_TTL_MS = 60_000;
const REFRESH_KEY = 'mock-api:refresh-session';
/** The mock has one session per browser tab (its sessionStorage "cookie"). */
const SESSION_ID = 'mock-session';
const SESSION_STARTED_AT = new Date().toISOString();

const accessTokens = new Map<string, { userId: number; expiresAt: number }>();

/** Counters exposed to automated tests (see mocks/browser.ts -> window.__mockApi). */
const stats = { loginCount: 0, refreshCount: 0 };

/** Test hook: expire every issued access token so the next API call exercises silent refresh. */
export function expireAllAccessTokens(): void {
  for (const session of accessTokens.values()) session.expiresAt = 0;
}

export function getMockStats(): { loginCount: number; refreshCount: number } {
  return { ...stats };
}

function issueAccessToken(user: MockUser): string {
  const token = `mock.${user.username}.${crypto.randomUUID()}`;
  accessTokens.set(token, { userId: user.id, expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS });
  return token;
}

function setRefreshSession(userId: number | null): void {
  try {
    if (userId === null) sessionStorage.removeItem(REFRESH_KEY);
    else sessionStorage.setItem(REFRESH_KEY, String(userId));
  } catch {
    // storage unavailable: refresh simply won't survive a reload
  }
}

function getRefreshSession(): MockUser | undefined {
  try {
    const id = Number(sessionStorage.getItem(REFRESH_KEY));
    return users.find((u) => u.id === id && u.isActive);
  } catch {
    return undefined;
  }
}

/** AuthUserResponse: roles by name, EFFECTIVE permissions (roles + direct grants). */
export function toUserDto(user: MockUser) {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    roles: rolesOf(user).map((role) => role.name),
    permissions: effectivePermissions(user),
    mustChangePassword: user.mustChangePassword,
  };
}

/** Ends every session of a user (mock: drops the tab's refresh "cookie" if it is theirs). */
export function revokeSessionsOf(userId: number): void {
  if (getRefreshSessionUserId() === userId) setRefreshSession(null);
  for (const [token, session] of accessTokens) if (session.userId === userId) accessTokens.delete(token);
}

function getRefreshSessionUserId(): number | null {
  try {
    const raw = sessionStorage.getItem(REFRESH_KEY);
    return raw === null ? null : Number(raw);
  } catch {
    return null;
  }
}

/** Sessions of a user as the API lists them (the mock knows only this tab's session). */
export function sessionsOf(userId: number, currentUserId: number | null) {
  if (getRefreshSessionUserId() !== userId) return [];
  const now = new Date();
  return [
    {
      id: SESSION_ID,
      startedAtUtc: SESSION_STARTED_AT,
      lastActiveAtUtc: now.toISOString(),
      expiresAtUtc: new Date(now.getTime() + 7 * 86_400_000).toISOString(),
      ipAddress: '127.0.0.1',
      userAgent: navigator.userAgent,
      current: currentUserId === userId,
    },
  ];
}

/**
 * Resolves the caller from the Bearer token. Returns the user, or a ready
 * 401/403 response to send back unchanged.
 */
export function authorize(request: Request, required: readonly string[] = []): MockUser | Response {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const session = accessTokens.get(token);
  if (!session || session.expiresAt < Date.now()) {
    accessTokens.delete(token);
    return problem(401, 'Access token is missing or expired');
  }
  const user = users.find((u) => u.id === session.userId && u.isActive);
  if (!user) return problem(401, 'Unknown user');
  // API: PermissionHandler refuses every permission policy while a password change is pending.
  if (required.length > 0 && user.mustChangePassword) return problem(403, 'Change your password first');
  if (!hasPermissions(effectivePermissions(user), required)) {
    return problem(403, `Missing permission: ${required.join(', ')}`);
  }
  return user;
}

interface RegisterBody {
  username?: unknown;
  displayName?: unknown;
  email?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** Same rules and messages as RegisterRequest + AuthEndpoints.Register in the API. */
function registerErrors(body: RegisterBody | undefined): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const username = text(body?.username);
  const email = text(body?.email);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (username.length < 3 || username.length > 64) errors.username = ['Use 3 to 64 characters'];
  else if (!/^[A-Za-z0-9._-]+$/.test(username)) errors.username = ['Use letters, digits, dots, dashes or underscores'];
  else if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) errors.username = ['This username is already taken'];
  if (!text(body?.displayName)) errors.displayName = ['Full name is required'];
  if (!/^[^@\s]+@[^@\s]+$/.test(email)) errors.email = ['Enter a valid email address'];
  else if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) errors.email = ['An account with this email already exists'];
  if (password.length < 8) errors.password = ['Use at least 8 characters'];
  else if (!(/[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password))) {
    errors.password = ['Include an uppercase letter, a lowercase letter and a digit'];
  }
  if (body?.confirmPassword !== password) errors.confirmPassword = ['Passwords do not match'];
  return errors;
}

interface LoginBody {
  username?: unknown;
  password?: unknown;
}

interface ChangePasswordBody {
  currentPassword?: unknown;
  newPassword?: unknown;
  confirmPassword?: unknown;
}

const actorOf = (user: MockUser) => ({ actorUserId: user.id, actorName: user.displayName });

function lockedProblem(user: MockUser): Response {
  const minutes = Math.max(1, Math.ceil((new Date(user.lockoutEndUtc ?? 0).getTime() - Date.now()) / 60_000));
  return new Response(
    JSON.stringify({
      type: 'https://httpstatuses.io/401',
      title: 'Account temporarily locked',
      status: 401,
      detail: `Too many failed sign-in attempts. Try again in ${String(minutes)} minute${minutes === 1 ? '' : 's'}.`,
    }),
    { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

export const authHandlers = [
  http.post(api(env.VITE_AUTH_LOGIN_PATH), async ({ request }) => {
    await delay(400);
    const body = (await readBody(request)) as LoginBody | undefined;
    const username = typeof body?.username === 'string' ? body.username : '';
    const user = users.find((u) => u.username === username);

    if (user?.isActive && isLockedOut(user)) {
      recordAudit({ action: 'auth.login_failed', targetType: 'user', targetId: String(user.id), targetName: user.username, details: { reason: 'locked' }, ...actorOf(user) });
      return lockedProblem(user);
    }
    if (!user?.isActive || user.password !== body?.password) {
      if (user?.isActive) {
        user.failedLoginCount += 1;
        if (user.failedLoginCount >= SECURITY.maxFailedLoginAttempts) {
          user.failedLoginCount = 0;
          user.lockoutEndUtc = new Date(Date.now() + SECURITY.lockoutMinutes * 60_000).toISOString();
          recordAudit({ action: 'auth.locked_out', targetType: 'user', targetId: String(user.id), targetName: user.username, details: { until: user.lockoutEndUtc }, ...actorOf(user) });
          return lockedProblem(user);
        }
      }
      recordAudit({
        action: 'auth.login_failed',
        targetType: 'user',
        targetId: user ? String(user.id) : null,
        targetName: user?.username ?? username,
        actorUserId: user?.id ?? null,
        actorName: user?.displayName ?? null,
      });
      return problem(401, 'Invalid username or password');
    }

    user.failedLoginCount = 0;
    user.lockoutEndUtc = null;
    user.lastLoginAtUtc = new Date().toISOString();
    recordAudit({ action: 'auth.login', targetType: 'user', targetId: String(user.id), targetName: user.username, ...actorOf(user) });
    stats.loginCount += 1;
    setRefreshSession(user.id);
    return ok({ accessToken: issueAccessToken(user), user: toUserDto(user) });
  }),

  http.post(api(env.VITE_AUTH_REGISTER_PATH), async ({ request }) => {
    await delay(400);
    const body = (await readBody(request)) as RegisterBody | undefined;
    const errors = registerErrors(body);
    if (Object.keys(errors).length > 0) return problem(400, 'One or more validation errors occurred.', errors);
    let role = roles.find((r) => r.name === SIGNUP_DEFAULT_ROLE);
    if (!role) {
      role = { id: nextId(roles), name: SIGNUP_DEFAULT_ROLE, description: 'Default role of self-registered accounts', isSystem: false, permissions: ['employees:read'], createdAtUtc: new Date().toISOString(), updatedAtUtc: null };
      roles.push(role);
    }
    const now = new Date().toISOString();
    const user: MockUser = {
      id: nextId(users),
      username: text(body?.username),
      password: String(body?.password),
      displayName: text(body?.displayName),
      email: text(body?.email),
      roleIds: [role.id],
      directPermissions: [],
      isActive: true,
      createdAtUtc: now,
      failedLoginCount: 0,
      lockoutEndUtc: null,
      mustChangePassword: false,
      lastLoginAtUtc: now,
      passwordChangedAtUtc: now,
    };
    users.push(user);
    recordAudit({ action: 'auth.signup', targetType: 'user', targetId: String(user.id), targetName: user.username, details: { role: role.name }, ...actorOf(user) });
    stats.loginCount += 1;
    setRefreshSession(user.id);
    return ok({ accessToken: issueAccessToken(user), user: toUserDto(user) }, 201);
  }),

  http.post(api(env.VITE_AUTH_CHANGE_PASSWORD_PATH), async ({ request }) => {
    await delay(300);
    const user = authorize(request);
    if (user instanceof Response) return user;
    const body = (await readBody(request)) as ChangePasswordBody | undefined;
    const current = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    const next = typeof body?.newPassword === 'string' ? body.newPassword : '';
    const fieldError = (field: string, message: string) => problem(400, 'One or more validation errors occurred.', { [field]: [message] });
    if (current !== user.password) return fieldError('currentPassword', 'Current password is incorrect');
    if (next.length < 8 || !(/[A-Z]/.test(next) && /[a-z]/.test(next) && /\d/.test(next))) {
      return fieldError('newPassword', 'Include an uppercase letter, a lowercase letter and a digit');
    }
    if (next === current) return fieldError('newPassword', 'Choose a password different from the current one');
    if (body?.confirmPassword !== next) return fieldError('confirmPassword', 'Passwords do not match');

    const forced = user.mustChangePassword;
    user.password = next;
    user.mustChangePassword = false;
    user.passwordChangedAtUtc = new Date().toISOString();
    recordAudit({ action: 'auth.password_changed', targetType: 'user', targetId: String(user.id), targetName: user.username, details: { forced }, ...actorOf(user) });
    return ok({ accessToken: issueAccessToken(user), user: toUserDto(user), otherSessionsSignedOut: 0 });
  }),

  http.get(api(env.VITE_AUTH_SESSIONS_PATH), async ({ request }) => {
    await delay(150);
    const user = authorize(request);
    if (user instanceof Response) return user;
    return ok(sessionsOf(user.id, user.id));
  }),

  http.delete(api(`${env.VITE_AUTH_SESSIONS_PATH}/:sessionId`), async ({ request, params }) => {
    await delay(150);
    const user = authorize(request);
    if (user instanceof Response) return user;
    if (params.sessionId !== SESSION_ID) return problem(404, 'Session not found');
    recordAudit({ action: 'auth.session_revoked', targetType: 'user', targetId: String(user.id), targetName: user.displayName, details: { session: SESSION_ID }, ...actorOf(user) });
    setRefreshSession(null);
    return noContent();
  }),

  http.post(api(env.VITE_AUTH_REFRESH_PATH), async () => {
    await delay(150);
    const user = getRefreshSession();
    if (!user) return problem(401, 'Refresh session expired');
    stats.refreshCount += 1;
    return ok({ accessToken: issueAccessToken(user) });
  }),

  http.get(api(env.VITE_AUTH_ME_PATH), async ({ request }) => {
    await delay(150);
    const result = authorize(request);
    return result instanceof Response ? result : ok(toUserDto(result));
  }),

  http.post(api(env.VITE_AUTH_LOGOUT_PATH), async () => {
    setRefreshSession(null); // like a real server: the cookie is invalid as soon as the request arrives
    await delay(100);
    return noContent();
  }),
];
