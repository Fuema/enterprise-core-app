import { z } from 'zod';
import type { Employee, EmployeeInput } from '../types/employee';

/** Today as YYYY-MM-DD in the user's time zone. */
function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${String(now.getFullYear())}-${month}-${day}`;
}

const selectId = (message: string) => z.number({ error: message }).int().positive(message);

/**
 * Client-side validation, mirroring EmployeeRequest (DataAnnotations) in the API.
 * The API validates again (plus location consistency and unique email) and its
 * ProblemDetails field errors are mapped onto these fields automatically.
 */
export const employeeFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(50, 'Max 50 characters'),
  lastName: z.string().trim().min(1, 'Last name is required').max(50, 'Max 50 characters'),
  dateOfBirth: z.iso
    .date('Enter a valid date')
    .refine((value) => value <= localToday(), 'Date of birth cannot be in the future'),
  email: z.email('Enter a valid email address').max(100, 'Max 100 characters'),
  gender: z.string().regex(/^(Male|Female)$/, 'Select a gender'),
  countryId: selectId('Select a country'),
  stateId: selectId('Select a state'),
  cityId: selectId('Select a city'),
  address: z.string().trim().min(1, 'Address is required').max(100, 'Max 100 characters'),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
}) satisfies z.ZodType<EmployeeInput>;

export type EmployeeFormValues = z.output<typeof employeeFormSchema>;

export const emptyEmployeeForm: EmployeeFormValues = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  email: '',
  gender: '',
  countryId: 0,
  stateId: 0,
  cityId: 0,
  address: '',
  pincode: '',
};

export function toEmployeeFormValues(employee: Employee): EmployeeFormValues {
  const { id: _id, countryName: _country, stateName: _state, cityName: _city, ...values } = employee;
  return values;
}
