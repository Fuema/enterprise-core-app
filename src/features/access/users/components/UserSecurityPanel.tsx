import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, LockOpen } from 'lucide-react';
import { useState } from 'react';
import { GenericActionGuard } from '@/components/shared/GenericActionGuard';
import { Button } from '@/components/ui/Button';
import { SessionList } from '@/features/auth';
import type { ApiError } from '@/lib/apiError';
import { userQueries, userService } from '../services/userService';
import { isLockedOut, USER_PERMISSIONS, type User } from '../types/user';

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function formatDate(value: string | null, fallback: string): string {
  return value ? dateTime.format(new Date(value)) : fallback;
}

/**
 * Account security for administrators: sign-in status, unlock, password reset
 * (temporary password shown once) and the user's active sessions.
 */
export function UserSecurityPanel({ user, isSelf }: { user: User; isSelf: boolean }) {
  const queryClient = useQueryClient();
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const sessions = useQuery(userQueries.sessions(user.id));
  const locked = isLockedOut(user);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: userService.keys.detail(user.id) });
    await queryClient.invalidateQueries({ queryKey: userService.keys.lists() });
  };

  const unlock = useMutation<void, ApiError>({ mutationFn: () => userService.unlock(user.id), onSuccess: refresh });
  const reset = useMutation<string, ApiError>({
    mutationFn: () => userService.resetPassword(user.id),
    onSuccess: async (password) => {
      setTemporaryPassword(password);
      setConfirmingReset(false);
      await refresh();
    },
  });
  // Variables: a session id, or 'all' for every session.
  const revoke = useMutation<void, ApiError, string>({
    mutationFn: (sessionId) =>
      sessionId === 'all' ? userService.revokeAllSessions(user.id) : userService.revokeSession(user.id, sessionId),
    onSuccess: refresh,
  });
  const error = unlock.error ?? reset.error ?? revoke.error;

  return (
    <div className="grid gap-5">
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Last sign-in</dt>
          <dd className="font-medium">{formatDate(user.lastLoginAtUtc, 'Never')}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Password changed</dt>
          <dd className="font-medium">{formatDate(user.passwordChangedAtUtc, 'Never')}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Sign-in status</dt>
          <dd className="font-medium">
            {locked
              ? `Locked until ${formatDate(user.lockoutEndUtc, '')}`
              : user.failedLoginCount > 0
                ? `${String(user.failedLoginCount)} failed attempt(s)`
                : 'OK'}
          </dd>
        </div>
      </dl>

      <GenericActionGuard permissions={[USER_PERMISSIONS.write]}>
        <div className="flex flex-wrap items-center gap-2">
          {locked && (
            <Button variant="outline" disabled={unlock.isPending} onClick={() => unlock.mutate()}>
              <LockOpen />
              Unlock account
            </Button>
          )}
          {!isSelf &&
            (confirmingReset ? (
              <span className="inline-flex flex-wrap items-center gap-2 text-sm">
                Sign the user out everywhere and set a temporary password?
                <Button variant="destructive" size="sm" disabled={reset.isPending} onClick={() => reset.mutate()}>
                  Confirm reset
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmingReset(false)}>
                  Cancel
                </Button>
              </span>
            ) : (
              <Button variant="outline" onClick={() => setConfirmingReset(true)}>
                <KeyRound />
                Reset password
              </Button>
            ))}
        </div>
      </GenericActionGuard>

      {temporaryPassword && (
        <div role="status" className="grid gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p>
            Temporary password for <strong>{user.username}</strong>. It is shown only once; the user must change it at the
            next sign-in.
          </p>
          <div className="flex items-center gap-2">
            <code className="rounded bg-white px-2 py-1 font-mono text-base" aria-label="Temporary password">
              {temporaryPassword}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void navigator.clipboard.writeText(temporaryPassword)}
              aria-label="Copy temporary password"
            >
              <Copy />
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Active sessions</h3>
          <GenericActionGuard permissions={[USER_PERMISSIONS.write]}>
            {(sessions.data?.length ?? 0) > 0 && (
              <Button variant="ghost" size="sm" disabled={revoke.isPending} onClick={() => revoke.mutate('all')}>
                End all sessions
              </Button>
            )}
          </GenericActionGuard>
        </div>
        <GenericActionGuard
          permissions={[USER_PERMISSIONS.write]}
          fallback={<SessionList sessions={sessions.data} isLoading={sessions.isPending} />}
        >
          <SessionList
            sessions={sessions.data}
            isLoading={sessions.isPending}
            onRevoke={(session) => revoke.mutate(session.id)}
            revokingId={revoke.isPending && revoke.variables !== 'all' ? revoke.variables : undefined}
            emptyMessage={`${user.username} is not signed in anywhere.`}
          />
        </GenericActionGuard>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error.detail ?? error.title}
        </p>
      )}
    </div>
  );
}
