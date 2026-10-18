import { z } from 'zod';
import type { SortableField } from '@/types/generic-api';

export const roleRefSchema = z.object({ id: z.number().int(), name: z.string(), isSystem: z.boolean().default(false) });
export type RoleRef = z.output<typeof roleRefSchema>;

const nullableDate = z.string().nullable().default(null);

/**
 * One schema for list rows (UserListItem) and the detail (UserDetailResponse):
 * detail-only fields default when a list row is parsed. Never contains the password hash.
 */
export const userSchema = z.object({
  id: z.number().int().positive(),
  username: z.string(),
  displayName: z.string(),
  email: z.string().nullable().default(null),
  isActive: z.boolean(),
  /** ISO timestamp (UTC) until which sign-in is blocked; null = not locked. */
  lockoutEndUtc: nullableDate,
  mustChangePassword: z.boolean().default(false),
  lastLoginAtUtc: nullableDate,
  createdAtUtc: z.string(),
  roles: z.array(roleRefSchema).default([]),
  /** List only. */
  directPermissionCount: z.number().int().default(0),
  /** Detail only. */
  failedLoginCount: z.number().int().default(0),
  passwordChangedAtUtc: nullableDate,
  directPermissions: z.array(z.string()).default([]),
  effectivePermissions: z.array(z.string()).default([]),
});

export type User = z.output<typeof userSchema>;
export type UserId = User['id'];

/** PUT /users/{id}. */
export interface UserUpdate {
  displayName: string;
  email: string | null;
  roleIds: number[];
  directPermissions: string[];
  isActive: boolean;
}

/** POST /users (the account gets a one-time temporary password). */
export interface UserCreate {
  username: string;
  displayName: string;
  email: string | null;
  roleIds: number[];
  directPermissions: string[];
}

export const userCreatedSchema = z.object({ user: userSchema, temporaryPassword: z.string() });
export const temporaryPasswordSchema = z.object({ temporaryPassword: z.string() });

export const USER_SORTABLE_FIELDS = [
  'username',
  'displayName',
  'email',
  'isActive',
  'lastLoginAtUtc',
  'createdAtUtc',
] as const satisfies readonly SortableField<User>[];

/** Must match Auth/Permissions.cs. Accounts are deactivated, never deleted. */
export const USER_PERMISSIONS = {
  read: 'users:read',
  write: 'users:write',
} as const;

export function isLockedOut(user: Pick<User, 'lockoutEndUtc'>, now = new Date()): boolean {
  return user.lockoutEndUtc !== null && new Date(user.lockoutEndUtc) > now;
}
