import type { ReactNode } from 'react';
import { FormRootError, FormSubmitButton, GenericFormElement } from '@/components/shared/GenericFormElement';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { AccessFields } from './AccessFields';
import {
  userCreateFormSchema,
  userFormSchema,
  type UserCreateFormValues,
  type UserFormValues,
} from './userFormSchema';

interface ProfileValues {
  username?: string;
  displayName: string;
  email: string;
}

function ProfileFields({ withUsername = false }: { withUsername?: boolean }) {
  const { control } = useFormContext<ProfileValues>();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {withUsername && (
        <FormField
          control={control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField
        control={control}
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
        control={control}
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
  );
}

interface UserFormProps {
  defaultValues: UserFormValues;
  onSubmit: (values: UserFormValues) => Promise<void>;
  actions?: ReactNode;
}

/** Edit an existing account: profile, active flag, roles, extra permissions. */
export function UserForm({ defaultValues, onSubmit, actions }: UserFormProps) {
  return (
    <GenericFormElement schema={userFormSchema} defaultValues={defaultValues} onSubmit={onSubmit}>
      {(form) => (
        <>
          <ProfileFields />
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
          <AccessFields />
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

interface UserCreateFormProps {
  defaultValues: UserCreateFormValues;
  onSubmit: (values: UserCreateFormValues) => Promise<void>;
  actions?: ReactNode;
}

/** New account: the server generates a temporary password that must be changed at first sign-in. */
export function UserCreateForm({ defaultValues, onSubmit, actions }: UserCreateFormProps) {
  return (
    <GenericFormElement schema={userCreateFormSchema} defaultValues={defaultValues} onSubmit={onSubmit}>
      {() => (
        <>
          <ProfileFields withUsername />
          <AccessFields />
          <FormRootError />
          <div className="flex flex-wrap items-center gap-2">
            <FormSubmitButton>Create user</FormSubmitButton>
            {actions}
          </div>
        </>
      )}
    </GenericFormElement>
  );
}
