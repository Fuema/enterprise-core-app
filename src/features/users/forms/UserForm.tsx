import type { ReactNode } from 'react';
import { FormRootError, FormSubmitButton, GenericFormElement } from '@/components/shared/GenericFormElement';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { PermissionEditor } from './PermissionEditor';
import { userFormSchema, type UserFormValues } from './userFormSchema';

interface UserFormProps {
  defaultValues: UserFormValues;
  onSubmit: (values: UserFormValues) => Promise<void>;
  actions?: ReactNode;
}

export function UserForm({ defaultValues, onSubmit, actions }: UserFormProps) {
  return (
    <GenericFormElement schema={userFormSchema} defaultValues={defaultValues} onSubmit={onSubmit}>
      {(form) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
          </div>
          <FormField
            control={form.control}
            name="roles"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Roles</FormLabel>
                <FormControl>
                  <Input autoComplete="off" placeholder="e.g. HR Manager, Auditor" {...field} />
                </FormControl>
                <FormDescription>Comma-separated labels. Access is decided by the permissions below.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
            render={({ field: { value, onChange, ...field } }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={value}
                      onChange={(event) => onChange(event.target.checked)}
                      {...field}
                    />
                  </FormControl>
                  <FormLabel>Active (can sign in)</FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <PermissionEditor />
          <FormRootError />
          <div className="flex flex-wrap items-center gap-2">
            <FormSubmitButton>Save changes</FormSubmitButton>
            {actions}
          </div>
        </>
      )}
    </GenericFormElement>
  );
}
