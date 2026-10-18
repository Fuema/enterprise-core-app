import { z } from 'zod';
import type { SortableField } from '@/types/generic-api';

/** Mirrors AuditEntryResponse. `details` is the JSON written by the API's AuditService. */
export const auditEntrySchema = z.object({
  id: z.number().int().positive(),
  occurredAtUtc: z.string(),
  actorUserId: z.number().int().nullable().default(null),
  actorName: z.string().nullable().default(null),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string().nullable().default(null),
  targetName: z.string().nullable().default(null),
  details: z.string().nullable().default(null),
  ipAddress: z.string().nullable().default(null),
});

export type AuditEntry = z.output<typeof auditEntrySchema>;

export const AUDIT_SORTABLE_FIELDS = ['occurredAtUtc', 'action', 'actorName', 'targetName'] as const satisfies readonly SortableField<AuditEntry>[];

/** Read-only log: there is no write scope. */
export const AUDIT_PERMISSIONS = { read: 'audit:read' } as const;

export const AUDIT_TARGET_TYPES = ['user', 'role'] as const;

/** Human labels for the API's action names (unknown actions show as-is). */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Signed in',
  'auth.login_failed': 'Sign-in failed',
  'auth.locked_out': 'Locked out',
  'auth.signup': 'Signed up',
  'auth.password_changed': 'Changed password',
  'auth.session_revoked': 'Signed out a device',
  'user.created': 'User created',
  'user.updated': 'User updated',
  'user.password_reset': 'Password reset',
  'user.unlocked': 'User unlocked',
  'user.sessions_revoked': 'Sessions revoked',
  'role.created': 'Role created',
  'role.updated': 'Role updated',
  'role.deleted': 'Role deleted',
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
