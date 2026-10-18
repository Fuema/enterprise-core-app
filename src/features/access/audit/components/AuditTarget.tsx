import { Link } from '@tanstack/react-router';
import type { AuditEntry } from '../types/audit';

/** Target of an audit entry, linked to the user/role page when it still makes sense. */
export function AuditTarget({ entry }: { entry: AuditEntry }) {
  const name = entry.targetName ?? entry.targetId ?? '—';
  const id = Number(entry.targetId);
  if (entry.targetType === 'user' && Number.isInteger(id) && id > 0) {
    return (
      <Link to="/users/$userId" params={{ userId: id }} className="underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>
        {name}
      </Link>
    );
  }
  if (entry.targetType === 'role' && Number.isInteger(id) && id > 0) {
    return (
      <Link to="/roles/$roleId" params={{ roleId: id }} className="underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>
        {name}
      </Link>
    );
  }
  return <>{name}</>;
}
