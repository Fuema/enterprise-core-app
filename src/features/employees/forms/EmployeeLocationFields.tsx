import { useQuery } from '@tanstack/react-query';
import { useFormContext, useWatch } from 'react-hook-form';
import { LookupSelect } from '@/components/shared/LookupSelect';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { locationQueries } from '../services/employeeService';
import type { EmployeeFormValues } from './employeeFormSchema';

/**
 * Country -> State -> City cascade. Changing a parent clears its children
 * (in the change handler, not an effect, so loading an existing employee
 * keeps its values). Each child list loads only once its parent is chosen.
 */
export function EmployeeLocationFields() {
  const form = useFormContext<EmployeeFormValues>();
  const countryId = useWatch({ control: form.control, name: 'countryId' });
  const stateId = useWatch({ control: form.control, name: 'stateId' });

  const countries = useQuery(locationQueries.countries());
  const states = useQuery(locationQueries.states(countryId));
  const cities = useQuery(locationQueries.cities(stateId));

  const clear = (...fields: ('stateId' | 'cityId')[]) => {
    for (const field of fields) form.setValue(field, 0, { shouldDirty: true, shouldValidate: false });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-3">
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
                  clear('stateId', 'cityId');
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
                onValueChange={(id) => {
                  onChange(id);
                  clear('cityId');
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="cityId"
        render={({ field: { value, onChange, ...field } }) => (
          <FormItem>
            <FormLabel>City</FormLabel>
            <FormControl>
              <LookupSelect
                {...field}
                items={cities.data}
                isLoading={cities.isFetching && !cities.data}
                disabled={!(stateId > 0)}
                value={value}
                placeholder={stateId > 0 ? 'Select a city…' : 'Choose a state first'}
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
