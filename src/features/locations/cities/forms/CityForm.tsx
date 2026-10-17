import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormRootError, FormSubmitButton, GenericFormElement } from '@/components/shared/GenericFormElement';
import { LookupSelect } from '@/components/shared/LookupSelect';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { locationLookups } from '../../lookups';
import { cityFormSchema, type CityFormValues } from './cityFormSchema';

interface CityFormProps {
  defaultValues: CityFormValues;
  onSubmit: (values: CityFormValues) => Promise<void>;
  submitLabel: string;
  actions?: ReactNode;
}

export function CityForm({ defaultValues, onSubmit, submitLabel, actions }: CityFormProps) {
  return (
    <GenericFormElement schema={cityFormSchema} defaultValues={defaultValues} onSubmit={onSubmit}>
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City name</FormLabel>
                <FormControl>
                  <Input autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <CityParentFields />
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

/** Country -> State cascade; changing the country clears the state. */
function CityParentFields() {
  const form = useFormContext<CityFormValues>();
  const countryId = useWatch({ control: form.control, name: 'countryId' });
  const countries = useQuery(locationLookups.countries());
  const states = useQuery(locationLookups.states(countryId));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
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
                onValueChange={(id) => {
                  onChange(id);
                  form.setValue('stateId', 0, { shouldDirty: true });
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="stateId"
        render={({ field: { value, onChange, ...field } }) => (
          <FormItem>
            <FormLabel>State</FormLabel>
            <FormControl>
              <LookupSelect
                {...field}
                items={states.data}
                isLoading={states.isFetching && !states.data}
                disabled={!(countryId > 0)}
                value={value}
                placeholder={countryId > 0 ? 'Select a state…' : 'Choose a country first'}
                onValueChange={onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
