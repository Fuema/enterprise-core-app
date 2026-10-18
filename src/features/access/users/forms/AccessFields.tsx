import { useQuery } from '@tanstack/react-query';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { Badge } from '@/components/ui/Badge';
import { accessLookups, type RoleOption } from '../../shared/accessLookups';
import { PermissionMatrixEditor } from '../../shared/PermissionMatrixEditor';

/** Form fields shared by the create and edit forms. */
interface AccessFieldValues {
  roleIds: number[];
  directPermissions: string[];
}

function inheritedFrom(roles: readonly RoleOption[] | undefined, roleIds: readonly number[]): string[] {
  const selected = new Set(roleIds);
  return [...new Set((roles ?? []).filter((role) => selected.has(role.id)).flatMap((role) => role.permissions))];
}

/**
 * Roles (checkbox list) + extra permissions (matrix showing what the selected
 * roles already grant). Effective access = roles ∪ extra permissions.
 */
export function AccessFields({ disabled = false }: { disabled?: boolean }) {
  const { control } = useFormContext<AccessFieldValues>();
  const roles = useQuery(accessLookups.roleOptions());
  const catalog = useQuery(accessLookups.permissionCatalog());
  const roleIds = useWatch({ control, name: 'roleIds' });
  const rolesField = useController({ control, name: 'roleIds' });
  const grantsField = useController({ control, name: 'directPermissions' });
  const selectedRoleIds = rolesField.field.value;

  const toggleRole = (roleId: number) => {
    rolesField.field.onChange(
      selectedRoleIds.includes(roleId) ? selectedRoleIds.filter((id) => id !== roleId) : [...selectedRoleIds, roleId],
    );
  };

  return (
    <div className="grid gap-5">
      <fieldset className="grid gap-2" disabled={disabled} aria-label="Roles">
        <legend className="text-sm font-medium">Roles</legend>
        {roles.isPending ? (
          <p className="text-sm text-muted-foreground">Loading roles…</p>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {(roles.data ?? []).map((role) => (
              <label key={role.id} className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-primary"
                  aria-label={`Role: ${role.name}`}
                  checked={selectedRoleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                />
                <span className="grid gap-0.5">
                  <span className="flex items-center gap-2 font-medium">
                    {role.name}
                    {role.isSystem && <Badge variant="muted">System</Badge>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {role.permissions.length === 0 ? 'No permissions' : role.permissions.join(', ')}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
        {rolesField.fieldState.error?.message && (
          <p role="alert" className="text-sm text-destructive">
            {rolesField.fieldState.error.message}
          </p>
        )}
      </fieldset>

      <PermissionMatrixEditor
        label="Extra permissions"
        value={grantsField.field.value}
        onChange={grantsField.field.onChange}
        catalog={catalog.data}
        inherited={inheritedFrom(roles.data, roleIds)}
        disabled={disabled}
        error={grantsField.fieldState.error?.message}
      />
    </div>
  );
}
