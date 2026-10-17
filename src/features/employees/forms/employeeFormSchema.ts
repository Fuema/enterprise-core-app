import { z } from 'zod';
import type { Employee, EmployeeInput } from '../types/employee';

/** Client-side validation. The API validates again and may return field errors (mapped automatically). */
export const employeeFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(50, 'Max 50 characters'),
  lastName: z.string().trim().min(1, 'Last name is required').max(50, 'Max 50 characters'),
  email: z.email('Enter a valid email address'),
  department: z.string().min(1, 'Select a department'),
  jobTitle: z.string().trim().min(1, 'Job title is required').max(80, 'Max 80 characters'),
  hireDate: z.iso.date('Enter a valid date'),
  isActive: z.boolean(),
}) satisfies z.ZodType<EmployeeInput>;

export type EmployeeFormValues = z.output<typeof employeeFormSchema>;

export const emptyEmployeeForm: EmployeeFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  department: '',
  jobTitle: '',
  hireDate: new Date().toISOString().slice(0, 10),
  isActive: true,
};

export function toEmployeeFormValues({ id: _id, ...values }: Employee): EmployeeFormValues {
  return values;
}
