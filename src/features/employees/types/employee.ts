import { z } from 'zod';
import type { SortableField } from '@/types/generic-api';

/**
 * Frontend contract for an employee (camelCase; wire casing is handled by the
 * network layer). Every entity received from the API is parsed with this
 * schema by EmployeeService (BaseApiService `schema` option).
 */
export const employeeSchema = z.object({
  id: z.number().int().positive(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  department: z.string(),
  jobTitle: z.string(),
  /** ISO date (YYYY-MM-DD). */
  hireDate: z.string(),
  isActive: z.boolean(),
});

export type Employee = z.output<typeof employeeSchema>;
export type EmployeeId = Employee['id'];

/** Payload for POST and PUT (the API replaces the whole resource on update). */
export type EmployeeInput = Omit<Employee, 'id'>;

/** Columns the API accepts in `sort` (allow-list enforced by the URL schema). */
export const EMPLOYEE_SORTABLE_FIELDS = [
  'lastName',
  'firstName',
  'email',
  'department',
  'jobTitle',
  'hireDate',
  'isActive',
] as const satisfies readonly SortableField<Employee>[];

/** Domain list used by the filter and the form. */
export const EMPLOYEE_DEPARTMENTS = ['Engineering', 'Finance', 'Human Resources', 'Payroll', 'Sales'] as const;

export function employeeFullName(employee: Pick<Employee, 'firstName' | 'lastName'>): string {
  return `${employee.firstName} ${employee.lastName}`;
}

/** Permission scopes used by this feature (must match the API). */
export const EMPLOYEE_PERMISSIONS = {
  read: 'employees:read',
  write: 'employees:write',
  delete: 'employees:delete',
} as const;
