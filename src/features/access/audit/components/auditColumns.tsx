import { dataTableColumnHelper } from '@/lib/dataTable';
import { auditActionLabel, type AuditEntry } from '../types/audit';
import { AuditTarget } from './AuditTarget';

const col = dataTableColumnHelper<AuditEntry>();
const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' });

function prettyDetails(details: string | null): string | null {
  if (!details) return null;
  try {
    return JSON.stringify(JSON.parse(details), null, 2);
  } catch {
    return details;
  }
}

/** Module-scope columns; sortable ids match AUDIT_SORTABLE_FIELDS. */
export const auditColumns = col.columns([
  col.accessor('occurredAtUtc', {
    header: 'When',
    cell: ({ getValue }) => <span className="whitespace-nowrap">{dateTime.format(new Date(getValue()))}</span>,
  }),
  col.accessor('action', { header: 'Action', cell: ({ getValue }) => auditActionLabel(getValue()) }),
  col.accessor('actorName', { header: 'By', cell: ({ getValue }) => getValue() ?? 'Anonymous' }),
  col.accessor('targetName', {
    header: 'Target',
    cell: ({ row }) => (
      <span>
        <span className="text-muted-foreground">{row.original.targetType}: </span>
        <AuditTarget entry={row.original} />
      </span>
    ),
  }),
  col.accessor('ipAddress', { header: 'IP', enableSorting: false, cell: ({ getValue }) => getValue() ?? '—' }),
  col.display({
    id: 'details',
    header: 'Details',
    enableSorting: false,
    cell: ({ row }) => {
      const details = prettyDetails(row.original.details);
      if (!details) return <span className="text-muted-foreground">—</span>;
      return (
        <details onClick={(event) => event.stopPropagation()}>
          <summary className="cursor-pointer text-xs text-muted-foreground">View</summary>
          <pre className="mt-1 max-w-md overflow-x-auto rounded bg-muted p-2 text-xs">{details}</pre>
        </details>
      );
    },
  }),
]);
