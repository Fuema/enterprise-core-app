import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router';
import { z } from 'zod';
import { isAuthenticated, LoginForm } from '@/features/auth';
import { env } from '@/lib/env';
import { isSafeRelativePath } from '@/lib/utils';

const loginSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  staticData: { persistSearch: false },
  beforeLoad: ({ search }) => {
    if (isAuthenticated()) {
      throw redirect({ href: isSafeRelativePath(search.redirect) ? search.redirect : '/', replace: true });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const { redirect: target } = Route.useSearch();
  const router = useRouter();

  const handleSuccess = async () => {
    await router.invalidate();
    await router.navigate({ href: isSafeRelativePath(target) ? target : '/', replace: true });
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-muted/40 px-4">
      <div className="grid w-full max-w-sm gap-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="grid gap-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">{env.VITE_APP_NAME}</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </div>
        <LoginForm onSuccess={handleSuccess} />
        {env.VITE_AUTH_SIGNUP_ENABLED && (
          <p className="text-center text-sm text-muted-foreground">
            New here?{' '}
            <Link to="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
