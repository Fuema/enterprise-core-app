import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router';
import { isAuthenticated, SignupForm } from '@/features/auth';
import { env } from '@/lib/env';

export const Route = createFileRoute('/signup')({
  staticData: { persistSearch: false },
  beforeLoad: () => {
    if (!env.VITE_AUTH_SIGNUP_ENABLED) throw redirect({ to: '/login', search: {}, replace: true });
    if (isAuthenticated()) throw redirect({ to: '/', replace: true });
  },
  component: SignupPage,
});

function SignupPage() {
  const router = useRouter();

  const handleSuccess = async () => {
    await router.invalidate();
    await router.navigate({ to: '/', replace: true });
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-muted/40 px-4 py-8">
      <div className="grid w-full max-w-sm gap-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="grid gap-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground">{env.VITE_APP_NAME}</p>
        </div>
        <SignupForm onSuccess={handleSuccess} />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" search={{}} className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
