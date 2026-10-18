import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient, unwrapEnvelope } from '@/lib/apiClient';

/**
 * Shared data of the access domain (Users, Roles): the permission catalog and
 * the role options for the user form. Every other feature of the app reads
 * access only through the auth store, never through this file.
 */
const catalogSchema = z.object({ scopes: z.array(z.string()) });

export const roleOptionSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  isSystem: z.boolean(),
  permissions: z.array(z.string()).default([]),
});
export type RoleOption = z.output<typeof roleOptionSchema>;

export const accessLookups = {
  all: ['access-lookups'] as const,
  /** GET /lookups/permissions: every grantable scope (any signed-in user). */
  permissionCatalog: () =>
    queryOptions({
      queryKey: ['access-lookups', 'permission-catalog'] as const,
      queryFn: async ({ signal }) => {
        const response = await apiClient.get<unknown>('/lookups/permissions', { signal });
        return catalogSchema.parse(unwrapEnvelope(response.data)).scopes;
      },
      staleTime: Infinity,
    }),
  /** GET /users/role-options: roles with their permissions (users:read). */
  roleOptions: () =>
    queryOptions({
      queryKey: ['access-lookups', 'role-options'] as const,
      queryFn: async ({ signal }) => {
        const response = await apiClient.get<unknown>('/users/role-options', { signal });
        return z.array(roleOptionSchema).parse(unwrapEnvelope(response.data));
      },
      staleTime: 60_000,
    }),
};
