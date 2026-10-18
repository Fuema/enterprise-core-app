import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { FormRootError, FormSubmitButton, GenericFormElement } from '@/components/shared/GenericFormElement';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { accessLookups } from '../../shared/accessLookups';
import { PermissionMatrixEditor } from '../../shared/PermissionMatrixEditor';
import { roleFormSchema, type RoleFormValues } from './roleFormSchema';

interface RoleFormProps {
  defaultValues: RoleFormValues;
  onSubmit: (values: RoleFormValues) => Promise<void>;
  submitLabel: string;
  /** System role: name and permissions are locked (only the description can change). */
  isSystem?: boolean;
  actions?: ReactNode;
}

export function RoleForm({ defaultValues, onSubmit, submitLabel, isSystem = false, actions }: RoleFormProps) {
  const catalog = useQuery(accessLookups.permissionCatalog());

  return (
    <GenericFormElement schema={roleFormSchema} defaultValues={defaultValues} onSubmit={onSubmit}>
      {(form) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role name</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" readOnly={isSystem} {...field} />
                  </FormControl>
                  {isSystem && <FormDescription>System roles cannot be renamed.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="permissions"
            render={({ field, fieldState }) => (
              <PermissionMatrixEditor
                label="Role permissions"
                value={field.value}
                onChange={field.onChange}
                catalog={catalog.data}
                disabled={isSystem}
                error={fieldState.error?.message}
              />
            )}
          />
          {isSystem && (
            <p className="text-sm text-muted-foreground">
              The Administrator role always has every permission and cannot be deleted.
            </p>
          )}
          <FormRootError />
          <div className="flex flex-wrap items-center gap-2">
            <FormSubmitButton>{submitLabel}</FormSubmitButton>
            {actions}
          </div>
        </>
      )}
    </GenericFormElement>
  );
}
