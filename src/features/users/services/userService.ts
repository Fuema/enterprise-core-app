import { queryOptions } from '@tanstack/react-query';
import { unwrapEnvelope } from '@/lib/apiClient';
import { BaseApiService } from '@/services/BaseApiService';
import { entityQueries } from '@/services/entityQueries';
import { permissionCatalogSchema, userSchema, type User, type UserId, type UserUpdate } from '../types/user';

/** Accounts: list, detail and update only (creation = signup; no hard delete). */
class UserService extends BaseApiService<User, UserId, never, UserUpdate> {
  constructor() {
    super('/users', { schema: userSchema });
  }

  /** Every grantable scope, so the permission editor follows the API. */
  async getPermissionCatalog(signal?: AbortSignal): Promise<string[]> {
    const response = await this.http.get<unknown>(`${this.resourcePath}/permissions`, { signal });
    return permissionCatalogSchema.parse(unwrapEnvelope(response.data)).scopes;
  }
}

export const userService = new UserService();
export const userQueries = {
  ...entityQueries(userService),
  permissionCatalog: () =>
    queryOptions({
      queryKey: [...userService.keys.all, 'permission-catalog'] as const,
      queryFn: ({ signal }) => userService.getPermissionCatalog(signal),
      staleTime: Infinity,
    }),
};
