import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import {
  ChangePasswordForm,
  fetchMySessions,
  logout,
  revokeMySession,
  SessionList,
  useAuthStore,
  type Session,
} from '@/features/auth';

const MY_SESSIONS_KEY = ['auth', 'my-sessions'] as const;

/** The signed-in user's own account: password and devices. Always reachable (also during a forced change). */
export const Route = createFileRoute('/_authenticated/account')({
  staticData: { breadcrumb: 'My account', persistSearch: false },
  component: AccountPage,
});

function AccountPage() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [changed, setChanged] = useState(false);
  const sessions = useQuery({ queryKey: MY_SESSIONS_KEY, queryFn: ({ signal }) => fetchMySessions(signal) });

  const revoke = useMutation({
    mutationFn: async (session: Session) => {
      await revokeMySession(session.id);
      // Signing out this device ends the session here too.
      if (session.current) await logout();
      return session;
    },
    onSuccess: async (session) => {
      if (session.current) {
        await router.navigate({ to: '/login', search: {} });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: MY_SESSIONS_KEY });
    },
  });

  if (!user) return null;

  return (
    <section className="grid max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My account</h1>
        <p className="text-sm text-muted-foreground">
          {user.displayName}
          {user.email ? ` · ${user.email}` : ''} · {user.roles.length > 0 ? user.roles.join(', ') : 'no roles'}
        </p>
      </div>

      {user.mustChangePassword && (
        <div role="alert" className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldAlert className="size-5 shrink-0" aria-hidden />
          <p>
            An administrator reset your password. Choose a new one to continue; the rest of the app is locked until you do.
          </p>
        </div>
      )}

      <div className="grid gap-3 rounded-lg border bg-card p-6">
        <h2 className="font-medium">Change password</h2>
        <p className="text-sm text-muted-foreground">Your other devices are signed out when the password changes.</p>
        <ChangePasswordForm
          onChanged={async () => {
            setChanged(true);
            await queryClient.invalidateQueries({ queryKey: MY_SESSIONS_KEY });
            await router.invalidate();
          }}
        />
        {changed && (
          <p role="status" className="text-sm text-emerald-700">
            Password changed.
          </p>
        )}
      </div>

      <div className="grid gap-3 rounded-lg border bg-card p-6">
        <h2 className="font-medium">Where you're signed in</h2>
        <SessionList
          sessions={sessions.data}
          isLoading={sessions.isPending}
          onRevoke={(session) => revoke.mutate(session)}
          revokingId={revoke.isPending ? revoke.variables.id : undefined}
        />
      </div>
    </section>
  );
}
