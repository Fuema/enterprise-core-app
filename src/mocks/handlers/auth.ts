import { delay, http } from 'msw';
import { env } from '@/lib/env';
import { hasPermissions } from '@/lib/permissions';
import { users, type MockUser } from '../db';
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
    return users.find((u) => u.id === id);
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
  const user = users.find((u) => u.id === session.userId);
  if (!user) return problem(401, 'Unknown user');
  if (!hasPermissions(user.permissions, required)) {
    return problem(403, `Missing permission: ${required.join(', ')}`);
  }
  return user;
}

interface LoginBody {
  username?: unknown;
  password?: unknown;
}

export const authHandlers = [
  http.post(api(env.VITE_AUTH_LOGIN_PATH), async ({ request }) => {
    await delay(400);
    const body = (await readBody(request)) as LoginBody | undefined;
    const user = users.find((u) => u.username === body?.username && u.password === body.password);
    if (!user) return problem(401, 'Invalid username or password');
    setRefreshSession(user.id);
    return ok({ accessToken: issueAccessToken(user), user: toUserDto(user) });
  }),

  http.post(api(env.VITE_AUTH_REFRESH_PATH), async () => {
    await delay(150);
    const user = getRefreshSession();
    if (!user) return problem(401, 'Refresh session expired');
    return ok({ accessToken: issueAccessToken(user) });
  }),

  http.get(api(env.VITE_AUTH_ME_PATH), async ({ request }) => {
    await delay(150);
    const result = authorize(request);
    return result instanceof Response ? result : ok(toUserDto(result));
  }),

  http.post(api(env.VITE_AUTH_LOGOUT_PATH), async () => {
    await delay(100);
    setRefreshSession(null);
    return noContent();
  }),
];
