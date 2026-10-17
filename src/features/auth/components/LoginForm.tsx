import { FormRootError, FormSubmitButton, GenericFormElement } from '@/components/shared/GenericFormElement';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { useLogin } from '../hooks/useLogin';
import { loginSchema } from '../schemas/loginSchema';
import type { AuthUser } from '../types/auth';

export function LoginForm({ onSuccess }: { onSuccess: (user: AuthUser) => void | Promise<void> }) {
  const loginMutation = useLogin();

  return (
    <GenericFormElement
      schema={loginSchema}
      defaultValues={{ username: '', password: '' }}
      onSubmit={async (credentials) => {
        const user = await loginMutation.mutateAsync(credentials);
        await onSuccess(user);
      }}
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input autoComplete="username" autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormRootError />
          <FormSubmitButton className="w-full">Sign in</FormSubmitButton>
        </>
      )}
    </GenericFormElement>
  );
}
