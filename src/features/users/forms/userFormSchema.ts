import { z } from 'zod';
import type { User, UserUpdate } from '../types/user';

/**
 * Mirrors UserUpdateRequest in the API. Roles are edited as comma-separated
 * text; permissions with the matrix editor. Server-only rules (unknown scope,
 * duplicate email, cannot deactivate yourself / drop your own users:write)
 * come back as field errors.
 */
export const userFormSchema = z.object({
  displayName: z.string().trim().min(1, 'Full name is required').max(100, 'Max 100 characters'),
  email: z.union([z.literal(''), z.email('Enter a valid email address').max(256, 'Max 256 characters')]),
  roles: z
    .string()
    .max(400, 'Too many roles')
    .refine((value) => splitRoles(value).every((role) => role.length <= 50), 'Each role: max 50 characters'),
  permissions: z.array(z.string()),
  isActive: z.boolean(),
});

export type UserFormValues = z.output<typeof userFormSchema>;

export function splitRoles(value: string): string[] {
  return [...new Set(value.split(',').map((role) => role.trim()).filter(Boolean))];
}

export function toUserFormValues(user: User): UserFormValues {
  return {
    displayName: user.displayName,
    email: user.email ?? '',
    roles: user.roles.join(', '),
    permissions: [...user.permissions],
    isActive: user.isActive,
  };
}

export function toUserUpdate(values: UserFormValues): UserUpdate {
  return {
    displayName: values.displayName,
    email: values.email === '' ? null : values.email,
    roles: splitRoles(values.roles),
    permissions: values.permissions,
    isActive: values.isActive,
  };
}
