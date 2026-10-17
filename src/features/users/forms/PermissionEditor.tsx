import { useQuery } from '@tanstack/react-query';
import { useController, useFormContext } from 'react-hook-form';
import { userQueries } from '../services/userService';
import type { UserFormValues } from './userFormSchema';
import {
  grants,
  groupCatalog,
  hasWildcard,
  isSuperUser,
  toggleAction,
  toggleResource,
  toggleSuperUser,
} from './permissionMatrix';

const ACTION_COLUMNS = ['read', 'write', 'delete'] as const;
const ACTION_LABEL: Record<(typeof ACTION_COLUMNS)[number], string> = { read: 'View', write: 'Create / edit', delete: 'Delete' };

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Feature × action checkbox grid bound to the form's `permissions` array.
 * Rows come from the API catalog (GET /users/permissions), so a new feature
 * scope appears here without frontend changes.
 */
export function PermissionEditor() {
  const { control } = useFormContext<UserFormValues>();
  const { field, fieldState } = useController({ control, name: 'permissions' });
  const catalog = useQuery(userQueries.permissionCatalog());
  const granted = field.value;
  const superUser = isSuperUser(granted);
  const groups = groupCatalog(catalog.data ?? []);

  return (
    <fieldset className="grid gap-3" aria-describedby={fieldState.error ? 'permissions-error' : undefined}>
      <legend className="text-sm font-medium">Permissions</legend>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={superUser}
          onChange={() => field.onChange(toggleSuperUser(granted))}
        />
        Administrator: every permission, including future features (<code>*</code>)
      </label>

      {catalog.isPending ? (
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
                const label = capitalize(group.resource);
                return (
                  <tr key={group.resource} className="border-t">
                    <th scope="row" className="px-3 py-2 text-left font-medium">
                      {label}
                    </th>
                    {ACTION_COLUMNS.map((action) => (
                      <td key={action} className="px-2 py-2 text-center">
                        {group.actions.includes(action) ? (
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            aria-label={`${label}: ${ACTION_LABEL[action]}`}
                            checked={grants(granted, group.resource, action)}
                            disabled={superUser}
                            onChange={() => field.onChange(toggleAction(granted, group, action))}
                          />
                        ) : (
                          <span className="text-muted-foreground/50" aria-hidden>
                            —
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        aria-label={`${label}: all permissions`}
                        checked={superUser || hasWildcard(granted, group.resource)}
                        disabled={superUser}
                        onChange={() => field.onChange(toggleResource(granted, group))}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {fieldState.error?.message && (
        <p id="permissions-error" role="alert" className="text-sm text-destructive">
          {fieldState.error.message}
        </p>
      )}
    </fieldset>
  );
}
