import { z } from 'zod';

/** Authenticated principal as the UI needs it. Extend in your app if required. */
export const authUserSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  displayName: z.string().min(1),
  email: z.string().optional(),
  roles: z.array(z.string()).default([]),
  /** Effective access-control scopes (roles + direct grants), e.g. "employees:read", "employees:*". */
  permissions: z.array(z.string()).default([]),
  /** Set after an administrator's password reset: the app only allows the account page. */
  mustChangePassword: z.boolean().default(false),
});

export type AuthUser = z.output<typeof authUserSchema>;

/** Login may return the user directly; if not, the client calls the "me" endpoint. */
export const loginResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: authUserSchema.optional(),
});

/** One signed-in device/browser (GET /auth/sessions). */
export const sessionSchema = z.object({
  id: z.string(),
  startedAtUtc: z.string(),
  lastActiveAtUtc: z.string(),
  expiresAtUtc: z.string(),
  ipAddress: z.string().nullable().default(null),
  userAgent: z.string().nullable().default(null),
  current: z.boolean().default(false),
});

export type Session = z.output<typeof sessionSchema>;

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';
