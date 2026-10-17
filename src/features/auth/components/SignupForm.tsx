import type { HTMLInputTypeAttribute } from 'react';
import { FormRootError, FormSubmitButton, GenericFormElement } from '@/components/shared/GenericFormElement';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { useSignup } from '../hooks/useLogin';
import { emptySignupForm, signupSchema, type SignupRequest } from '../schemas/signupSchema';
import type { AuthUser } from '../types/auth';

interface FieldSpec {
  name: keyof SignupRequest;
  label: string;
  type?: HTMLInputTypeAttribute;
  autoComplete: string;
  description?: string;
}

const FIELDS: readonly FieldSpec[] = [
  { name: 'displayName', label: 'Full name', autoComplete: 'name' },
  { name: 'username', label: 'Username', autoComplete: 'username' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    autoComplete: 'new-password',
    description: '8+ characters with an uppercase letter, a lowercase letter and a digit.',
  },
  { name: 'confirmPassword', label: 'Confirm password', type: 'password', autoComplete: 'new-password' },
];

/** Self-service registration; server field errors (e.g. username taken) land under the matching input. */
export function SignupForm({ onSuccess }: { onSuccess: (user: AuthUser) => void | Promise<void> }) {
  const signupMutation = useSignup();

  return (
    <GenericFormElement
      schema={signupSchema}
      defaultValues={emptySignupForm}
      onSubmit={async (values) => {
        const user = await signupMutation.mutateAsync(values);
        await onSuccess(user);
      }}
    >
      {(form) => (
        <>
          {FIELDS.map((spec, index) => (
            <FormField
              key={spec.name}
              control={form.control}
              name={spec.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{spec.label}</FormLabel>
                  <FormControl>
                    <Input type={spec.type ?? 'text'} autoComplete={spec.autoComplete} autoFocus={index === 0} {...field} />
                  </FormControl>
                  {spec.description && <FormDescription>{spec.description}</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <FormRootError />
          <FormSubmitButton className="w-full">Create account</FormSubmitButton>
        </>
      )}
    </GenericFormElement>
  );
}
