import { z } from 'zod';
import type { SortableField } from '@/types/generic-api';

export const roleMemberSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  displayName: z.string(),
  isActive: z.boolean(),
});
export type RoleMember = z.output<typeof roleMemberSchema>;

/** List rows (RoleListItem) and detail (RoleDetailResponse); `members` only on the detail. */
export const roleSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullable().default(null),
  isSystem: z.boolean(),
  userCount: z.number().int().default(0),
  permissions: z.array(z.string()).default([]),
  members: z.array(roleMemberSchema).default([]),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string().nullable().default(null),
});

export type Role = z.output<typeof roleSchema>;
export type RoleId = Role['id'];

/** POST /roles and PUT /roles/{id}. */
export interface RoleInput {
  name: string;
  description: string | null;
  permissions: string[];
}

export const ROLE_SORTABLE_FIELDS = ['name', 'userCount', 'createdAtUtc'] as const satisfies readonly SortableField<Role>[];

/** Must match Auth/Permissions.cs. */
export const ROLE_PERMISSIONS = {
  read: 'roles:read',
  write: 'roles:write',
  delete: 'roles:delete',
} as const;
