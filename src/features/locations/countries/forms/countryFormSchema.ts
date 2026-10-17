import { z } from 'zod';
import type { Country, CountryInput } from '../types/country';

/** Mirrors CountryRequest in the API. */
export const countryFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Max 100 characters'),
}) satisfies z.ZodType<CountryInput>;

export type CountryFormValues = z.output<typeof countryFormSchema>;

export const emptyCountryForm: CountryFormValues = { name: '' };

export function toCountryFormValues(country: Country): CountryFormValues {
  return { name: country.name };
}
