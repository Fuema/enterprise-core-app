import { z } from 'zod';
import type { Role, RoleInput } from '../types/role';

/** Mirrors RoleRequest. Duplicate names and system-role rules come back as field errors. */
export const roleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(64, 'Max 64 characters')
    .refine((value) => !value.includes(','), 'Commas are not allowed'),
  description: z.string().trim().max(200, 'Max 200 characters'),
  permissions: z.array(z.string()),
});

export type RoleFormValues = z.output<typeof roleFormSchema>;

export const emptyRoleForm: RoleFormValues = { name: '', description: '', permissions: [] };

export function toRoleFormValues(role: Role): RoleFormValues {
  return { name: role.name, description: role.description ?? '', permissions: [...role.permissions] };
}

export function toRoleInput(values: RoleFormValues): RoleInput {
  return { ...values, description: values.description === '' ? null : values.description };
}
