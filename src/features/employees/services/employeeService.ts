import { z } from 'zod';
import { unwrapEnvelope } from '@/lib/apiClient';
import { BaseApiService } from '@/services/BaseApiService';
import { entityQueries } from '@/services/entityQueries';
import { employeeSchema, type Employee, type EmployeeId, type EmployeeInput } from '../types/employee';

const bulkDeleteResponseSchema = z.object({ deletedCount: z.number().int().min(0) });

/**
 * Concrete service: configuration plus one domain-specific call (bulk delete).
 * CRUD, paging, casing, auth, tenancy, envelopes and error mapping are
 * inherited from BaseApiService.
 */
class EmployeeService extends BaseApiService<Employee, EmployeeId, EmployeeInput, EmployeeInput> {
  constructor() {
    super('/employees', { schema: employeeSchema, updateMethod: 'put' });
  }

  /** POST /employees/bulk-delete { ids } -> number of rows deleted. */
  async deleteMany(ids: readonly EmployeeId[]): Promise<number> {
    const response = await this.http.post<unknown>(`${this.resourcePath}/bulk-delete`, { ids });
    return bulkDeleteResponseSchema.parse(unwrapEnvelope(response.data)).deletedCount;
  }
}

export const employeeService = new EmployeeService();

/** queryOptions factories: employeeQueries.list(filter), employeeQueries.detail(id). */
export const employeeQueries = entityQueries(employeeService);

/** Cascading location lookups, shared with the locations feature. */
export { locationLookups as locationQueries } from '@/features/locations/lookups';
