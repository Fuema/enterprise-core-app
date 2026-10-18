import type { EntityMutationOptions } from '@/hooks/useEntityMutations';
import { BaseApiService } from '@/services/BaseApiService';
import { entityQueries } from '@/services/entityQueries';
import { accessLookups } from '../../shared/accessLookups';
import { roleSchema, type Role, type RoleId, type RoleInput } from '../types/role';

class RoleService extends BaseApiService<Role, RoleId, RoleInput, RoleInput> {
  constructor() {
    super('/roles', { schema: roleSchema });
  }
}

export const roleService = new RoleService();
export const roleQueries = entityQueries(roleService);

/** Role changes affect the user form's role options and every user page (effective permissions). */
export const roleMutationOptions: EntityMutationOptions = { invalidate: [accessLookups.all, ['/users']] };
