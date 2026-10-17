import type { ReactNode } from 'react';
import { FormRootError, FormSubmitButton, GenericFormElement } from '@/components/shared/GenericFormElement';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { countryFormSchema, type CountryFormValues } from './countryFormSchema';

interface CountryFormProps {
  defaultValues: CountryFormValues;
  onSubmit: (values: CountryFormValues) => Promise<void>;
  submitLabel: string;
  actions?: ReactNode;
}

export function CountryForm({ defaultValues, onSubmit, submitLabel, actions }: CountryFormProps) {
  return (
    <GenericFormElement schema={countryFormSchema} defaultValues={defaultValues} onSubmit={onSubmit}>
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country name</FormLabel>
                <FormControl>
                  <Input autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
