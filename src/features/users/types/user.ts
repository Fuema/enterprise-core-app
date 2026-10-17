import { z } from 'zod';
import type { SortableField } from '@/types/generic-api';

/** Mirrors UserResponse in the API (never contains the password hash). */
export const userSchema = z.object({
  id: z.number().int().positive(),
  username: z.string(),
  displayName: z.string(),
  email: z.string().nullable().default(null),
  roles: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
  isActive: z.boolean(),
  /** ISO timestamp (UTC). */
  createdAtUtc: z.string(),
});

export type User = z.output<typeof userSchema>;
export type UserId = User['id'];

/** Payload for PUT /users/{id} (UserUpdateRequest). Accounts are created by signup. */
export interface UserUpdate {
  displayName: string;
  email: string | null;
  roles: string[];
  permissions: string[];
  isActive: boolean;
}

export const USER_SORTABLE_FIELDS = ['username', 'displayName', 'email', 'isActive', 'createdAtUtc'] as const satisfies readonly SortableField<User>[];

/** Must match Auth/Permissions.cs in the API. There is no delete: accounts are deactivated. */
export const USER_PERMISSIONS = {
  read: 'users:read',
  write: 'users:write',
} as const;

/** GET /users/permissions: every grantable scope ("employees:read", ...). */
export const permissionCatalogSchema = z.object({ scopes: z.array(z.string()) });
