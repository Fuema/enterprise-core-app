import { LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Session } from '../types/auth';
import { describeUserAgent } from '../utils/userAgent';

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

interface SessionListProps {
  sessions: readonly Session[] | undefined;
  isLoading: boolean;
  /** Omit to render read-only. */
  onRevoke?: (session: Session) => void;
  revokingId?: string | undefined;
  emptyMessage?: string;
}

/** Signed-in devices/browsers with "End session" per session (distinct from the header's "Sign out"). Shared by the account page and user admin. */
export function SessionList({ sessions, isLoading, onRevoke, revokingId, emptyMessage = 'No active sessions.' }: SessionListProps) {
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading sessions…</p>;
  if (!sessions || sessions.length === 0) return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;

  return (
    <ul className="divide-y rounded-md border" aria-label="Active sessions">
      {sessions.map((session) => {
        const device = describeUserAgent(session.userAgent);
        return (
          <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
            <div className="grid gap-0.5">
              <span className="flex items-center gap-2 font-medium">
                {device}
                {session.current && <Badge variant="success">This device</Badge>}
              </span>
              <span className="text-xs text-muted-foreground">
                {session.ipAddress ?? 'unknown IP'} · signed in {dateTime.format(new Date(session.startedAtUtc))} · last active{' '}
                {dateTime.format(new Date(session.lastActiveAtUtc))}
              </span>
            </div>
            {onRevoke && (
              <Button
                variant="ghost"
                size="sm"
                disabled={revokingId === session.id}
                onClick={() => onRevoke(session)}
                aria-label={`End session on ${device}${session.current ? ' (this device)' : ''}`}
              >
                <LogOut />
                End session
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
