import { z } from 'zod';
import type { User, UserCreate, UserUpdate } from '../types/user';

const email = z.union([z.literal(''), z.email('Enter a valid email address').max(256, 'Max 256 characters')]);
const displayName = z.string().trim().min(1, 'Full name is required').max(100, 'Max 100 characters');

/**
 * Mirrors UserUpdateRequest. Server-only rules (unknown scope, duplicate email,
 * self lock-out, last Administrator) come back as field errors on these keys.
 */
export const userFormSchema = z.object({
  displayName,
  email,
  roleIds: z.array(z.number().int()),
  directPermissions: z.array(z.string()),
  isActive: z.boolean(),
});
export type UserFormValues = z.output<typeof userFormSchema>;

/** Mirrors UserCreateRequest. */
export const userCreateFormSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Use 3 to 64 characters')
    .max(64, 'Use 3 to 64 characters')
    .regex(/^[A-Za-z0-9._-]+$/, 'Use letters, digits, dots, dashes or underscores'),
  displayName,
  email,
  roleIds: z.array(z.number().int()),
  directPermissions: z.array(z.string()),
});
export type UserCreateFormValues = z.output<typeof userCreateFormSchema>;

export const emptyUserCreateForm: UserCreateFormValues = {
  username: '',
  displayName: '',
  email: '',
  roleIds: [],
  directPermissions: [],
};

export function toUserFormValues(user: User): UserFormValues {
  return {
    displayName: user.displayName,
    email: user.email ?? '',
    roleIds: user.roles.map((role) => role.id),
    directPermissions: [...user.directPermissions],
    isActive: user.isActive,
  };
}

export function toUserUpdate(values: UserFormValues): UserUpdate {
  return { ...values, email: values.email === '' ? null : values.email };
}

export function toUserCreate(values: UserCreateFormValues): UserCreate {
  return { ...values, email: values.email === '' ? null : values.email };
}
