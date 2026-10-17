import { z } from 'zod';
import type { SortableField } from '@/types/generic-api';

/**
 * Frontend contract for an employee (camelCase; wire casing is handled by the
 * network layer). Every entity received from the API is parsed with this
 * schema by EmployeeService (BaseApiService `schema` option).
 *
 * Mirrors EmployeeResponse in the .NET API (enterprise-core-app-claude-server).
 */
export const employeeSchema = z.object({
  id: z.number().int().positive(),
  firstName: z.string(),
  lastName: z.string(),
  /** ISO date (YYYY-MM-DD), serialised from .NET DateOnly. */
  dateOfBirth: z.string(),
  email: z.string(),
  gender: z.string(),
  countryId: z.number().int(),
  stateId: z.number().int(),
  cityId: z.number().int(),
  address: z.string(),
  pincode: z.string(),
  /** Read-only, denormalised lookup names (LEFT JOINs on the server). */
  countryName: z.string().default(''),
  stateName: z.string().default(''),
  cityName: z.string().default(''),
});

export type Employee = z.output<typeof employeeSchema>;
export type EmployeeId = Employee['id'];

/** Payload for POST and PUT (the API replaces the whole resource on update). */
export type EmployeeInput = Omit<Employee, 'id' | 'countryName' | 'stateName' | 'cityName'>;

/** Columns the API accepts in `sort` (allow-list enforced by the URL schema AND by the API's SortMap). */
export const EMPLOYEE_SORTABLE_FIELDS = [
  'lastName',
  'firstName',
  'email',
  'dateOfBirth',
  'gender',
  'countryName',
  'stateName',
  'cityName',
  'pincode',
] as const satisfies readonly SortableField<Employee>[];

/** Allowed values (the API validates ^(Male|Female)$). */
export const EMPLOYEE_GENDERS = ['Male', 'Female'] as const;

export function employeeFullName(employee: Pick<Employee, 'firstName' | 'lastName'>): string {
  return `${employee.firstName} ${employee.lastName}`;
}

/** "Pune, Maharashtra, India" (skips missing parts). */
export function employeeLocation(employee: Pick<Employee, 'cityName' | 'stateName' | 'countryName'>): string {
  return [employee.cityName, employee.stateName, employee.countryName].filter(Boolean).join(', ');
}

/** Permission scopes used by this feature (must match Auth/Permissions.cs in the API). */
export const EMPLOYEE_PERMISSIONS = {
  read: 'employees:read',
  write: 'employees:write',
  delete: 'employees:delete',
} as const;
