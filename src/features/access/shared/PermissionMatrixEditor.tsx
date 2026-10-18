import {
  grants,
  groupCatalog,
  hasWildcard,
  isSuperUser,
  resourceLabel,
  toggleAction,
  toggleResource,
  toggleSuperUser,
} from './permissionMatrix';

const ACTION_COLUMNS = ['read', 'write', 'delete'] as const;
const ACTION_LABEL: Record<(typeof ACTION_COLUMNS)[number], string> = { read: 'View', write: 'Create / edit', delete: 'Delete' };

export interface PermissionMatrixEditorProps {
  /** The grants being edited (role permissions, or a user's direct grants). */
  value: readonly string[];
  onChange: (next: string[]) => void;
  /** Every grantable scope (accessLookups.permissionCatalog). `undefined` while loading. */
  catalog: readonly string[] | undefined;
  /**
   * Grants that already apply from elsewhere (a user's roles). Shown ticked and
   * disabled ("from a role"), so the editor only adds extra grants on top.
   */
  inherited?: readonly string[];
  /** Read-only (e.g. the locked Administrator role, or no write permission). */
  disabled?: boolean;
  /** Accessible name of the grid, e.g. "Role permissions", "Extra permissions". */
  label: string;
  error?: string | undefined;
}

/**
 * Feature × View / Create-edit / Delete grid with an "All" (resource:*) column and
 * an Administrator ("*") switch. Rows come from the API catalog, so a new feature
 * scope appears without frontend changes. Controlled: bind it with a FormField.
 */
export function PermissionMatrixEditor({
  value,
  onChange,
  catalog,
  inherited = [],
  disabled = false,
  label,
  error,
}: PermissionMatrixEditorProps) {
  const groups = groupCatalog(catalog ?? []);
  const superUser = isSuperUser(value);
  const inheritedSuperUser = isSuperUser(inherited);

  return (
    <fieldset className="grid gap-3" disabled={disabled} aria-label={label}>
      <legend className="text-sm font-medium">{label}</legend>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={superUser || inheritedSuperUser}
          disabled={inheritedSuperUser}
          onChange={() => onChange(toggleSuperUser(value))}
        />
        Administrator: every permission, including future features (<code>*</code>)
        {inheritedSuperUser && <span className="text-xs text-muted-foreground">(from a role)</span>}
      </label>

      {catalog === undefined ? (
        <p className="text-sm text-muted-foreground">Loading permissions…</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Feature</th>
                {ACTION_COLUMNS.map((action) => (
                  <th key={action} className="px-2 py-2 text-center font-medium">
                    {ACTION_LABEL[action]}
                  </th>
                ))}
                <th className="px-2 py-2 text-center font-medium">All</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const name = resourceLabel(group.resource);
                const allInherited = inheritedSuperUser || hasWildcard(inherited, group.resource);
                return (
                  <tr key={group.resource} className="border-t">
                    <th scope="row" className="px-3 py-2 text-left font-medium">
                      {name}
                    </th>
                    {ACTION_COLUMNS.map((action) => {
                      if (!group.actions.includes(action)) {
                        return (
                          <td key={action} className="px-2 py-2 text-center text-muted-foreground/50" aria-hidden>
                            —
                          </td>
                        );
                      }
                      const fromRole = grants(inherited, group.resource, action);
                      return (
                        <td key={action} className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            aria-label={`${name}: ${ACTION_LABEL[action]}`}
                            title={fromRole ? 'Granted by a role' : undefined}
                            checked={fromRole || grants(value, group.resource, action)}
                            disabled={fromRole || superUser}
                            onChange={() => onChange(toggleAction(value, group, action))}
                          />
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        aria-label={`${name}: all permissions`}
                        checked={allInherited || superUser || hasWildcard(value, group.resource)}
                        disabled={allInherited || superUser}
                        onChange={() => onChange(toggleResource(value, group))}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {inherited.length > 0 && (
        <p className="text-xs text-muted-foreground">Ticked and greyed out = already granted by the user's roles.</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
