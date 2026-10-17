import { z } from 'zod';

/** Authenticated principal as the UI needs it. Extend in your app if required. */
export const authUserSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  displayName: z.string().min(1),
  email: z.string().optional(),
  roles: z.array(z.string()).default([]),
  /** Flat access-control scopes, e.g. "employees:read", "employees:*". */
  permissions: z.array(z.string()).default([]),
});

export type AuthUser = z.output<typeof authUserSchema>;

/** Login may return the user directly; if not, the client calls the "me" endpoint. */
export const loginResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: authUserSchema.optional(),
});

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';
