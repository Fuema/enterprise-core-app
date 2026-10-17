import type { ReactNode } from 'react';
import { FormRootError, FormSubmitButton, GenericFormElement } from '@/components/shared/GenericFormElement';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { EMPLOYEE_DEPARTMENTS } from '../types/employee';
import { employeeFormSchema, type EmployeeFormValues } from './employeeFormSchema';

interface EmployeeFormProps {
  defaultValues: EmployeeFormValues;
  /** Throw (or let the mutation throw) an ApiError to get server field errors mapped onto the form. */
  onSubmit: (values: EmployeeFormValues) => Promise<void>;
  submitLabel: string;
  /** Extra buttons rendered next to submit (Cancel, Delete...). */
  actions?: ReactNode;
  disabled?: boolean;
}

/** Create/edit form: an instance of GenericFormElement bound to the employee schema. */
export function EmployeeForm({ defaultValues, onSubmit, submitLabel, actions, disabled = false }: EmployeeFormProps) {
  return (
    <GenericFormElement schema={employeeFormSchema} defaultValues={defaultValues} onSubmit={onSubmit}>
      {(form) => (
        <fieldset disabled={disabled} className="grid gap-4 disabled:opacity-80">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl>
                    <NativeSelect {...field}>
                      <option value="">Select…</option>
                      {EMPLOYEE_DEPARTMENTS.map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </NativeSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="jobTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job title</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="hireDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hire date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem className="content-end">
                  <div className="flex h-9 items-center gap-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={value}
                        onChange={(event) => onChange(event.target.checked)}
                        {...field}
                      />
                    </FormControl>
                    <FormLabel>Active</FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormRootError />
          <div className="flex flex-wrap items-center gap-2">
            <FormSubmitButton>{submitLabel}</FormSubmitButton>
            {actions}
          </div>
        </fieldset>
      )}
    </GenericFormElement>
  );
}
