import { delay, http } from 'msw';
import { env } from '@/lib/env';
import { hasPermissions } from '@/lib/permissions';
import { SIGNUP_DEFAULTS, nextId, users, type MockUser } from '../db';
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

function toUserDto(user: MockUser) {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    roles: user.roles,
    permissions: user.permissions,
  };
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
  if (!hasPermissions(user.permissions, required)) {
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

export const authHandlers = [
  http.post(api(env.VITE_AUTH_LOGIN_PATH), async ({ request }) => {
    await delay(400);
    const body = (await readBody(request)) as LoginBody | undefined;
    const user = users.find((u) => u.username === body?.username && u.password === body.password && u.isActive);
    if (!user) return problem(401, 'Invalid username or password');
    stats.loginCount += 1;
    setRefreshSession(user.id);
    return ok({ accessToken: issueAccessToken(user), user: toUserDto(user) });
  }),

  http.post(api(env.VITE_AUTH_REGISTER_PATH), async ({ request }) => {
    await delay(400);
    const body = (await readBody(request)) as RegisterBody | undefined;
    const errors = registerErrors(body);
    if (Object.keys(errors).length > 0) return problem(400, 'One or more validation errors occurred.', errors);
    const user: MockUser = {
      id: nextId(users),
      username: text(body?.username),
      password: String(body?.password),
      displayName: text(body?.displayName),
      email: text(body?.email),
      roles: [...SIGNUP_DEFAULTS.roles],
      permissions: [...SIGNUP_DEFAULTS.permissions],
      isActive: true,
      createdAtUtc: new Date().toISOString(),
    };
    users.push(user);
    stats.loginCount += 1;
    setRefreshSession(user.id);
    return ok({ accessToken: issueAccessToken(user), user: toUserDto(user) }, 201);
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
