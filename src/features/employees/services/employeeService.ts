import { BaseApiService } from '@/services/BaseApiService';
import { entityQueries } from '@/services/entityQueries';
import { employeeSchema, type Employee, type EmployeeId, type EmployeeInput } from '../types/employee';

/**
 * Concrete service: configuration only. CRUD, paging, casing, auth, tenancy,
 * envelopes and error mapping are inherited from BaseApiService.
 */
class EmployeeService extends BaseApiService<Employee, EmployeeId, EmployeeInput, EmployeeInput> {
  constructor() {
    super('/employees', { schema: employeeSchema, updateMethod: 'put' });
  }
}

export const employeeService = new EmployeeService();

/** queryOptions factories: employeeQueries.list(filter), employeeQueries.detail(id). */
export const employeeQueries = entityQueries(employeeService);
