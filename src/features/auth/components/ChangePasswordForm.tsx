import { FormRootError, FormSubmitButton, GenericFormElement } from '@/components/shared/GenericFormElement';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { useChangePassword } from '../hooks/useLogin';
import { changePasswordSchema, emptyChangePasswordForm, type ChangePasswordRequest } from '../schemas/changePasswordSchema';
import type { AuthUser } from '../types/auth';

const FIELDS: readonly { name: keyof ChangePasswordRequest; label: string; autoComplete: string; description?: string }[] = [
  { name: 'currentPassword', label: 'Current password', autoComplete: 'current-password' },
  {
    name: 'newPassword',
    label: 'New password',
    autoComplete: 'new-password',
    description: '8+ characters with an uppercase letter, a lowercase letter and a digit.',
  },
  { name: 'confirmPassword', label: 'Confirm new password', autoComplete: 'new-password' },
];

/** Change password; other sessions are signed out by the server, this one continues. */
export function ChangePasswordForm({ onChanged }: { onChanged: (user: AuthUser) => void | Promise<void> }) {
  const mutation = useChangePassword();

  return (
    <GenericFormElement
      schema={changePasswordSchema}
      defaultValues={emptyChangePasswordForm}
      mode="onSubmit"
      onSubmit={async (values, form) => {
        const user = await mutation.mutateAsync(values);
        form.reset(emptyChangePasswordForm);
        await onChanged(user);
      }}
    >
      {(form) => (
        <>
          {FIELDS.map((spec) => (
            <FormField
              key={spec.name}
              control={form.control}
              name={spec.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{spec.label}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete={spec.autoComplete} {...field} />
                  </FormControl>
                  {spec.description && <FormDescription>{spec.description}</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <FormRootError />
          <div>
            <FormSubmitButton>Change password</FormSubmitButton>
          </div>
        </>
      )}
    </GenericFormElement>
  );
}
