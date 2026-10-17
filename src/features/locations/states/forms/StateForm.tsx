import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { FormRootError, FormSubmitButton, GenericFormElement } from '@/components/shared/GenericFormElement';
import { LookupSelect } from '@/components/shared/LookupSelect';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { locationLookups } from '../../lookups';
import { stateFormSchema, type StateFormValues } from './stateFormSchema';

interface StateFormProps {
  defaultValues: StateFormValues;
  onSubmit: (values: StateFormValues) => Promise<void>;
  submitLabel: string;
  actions?: ReactNode;
}

export function StateForm({ defaultValues, onSubmit, submitLabel, actions }: StateFormProps) {
  const countries = useQuery(locationLookups.countries());

  return (
    <GenericFormElement schema={stateFormSchema} defaultValues={defaultValues} onSubmit={onSubmit}>
      {(form) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State name</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="countryId"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <LookupSelect
                      {...field}
                      items={countries.data}
                      isLoading={countries.isPending}
                      value={value}
                      placeholder="Select a country…"
                      onValueChange={onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
