import { z } from 'zod';
import type { City, CityInput } from '../types/city';

/**
 * Mirrors CityRequest in the API. `countryId` exists only to drive the
 * Country -> State cascade in the form; `toCityInput` drops it.
 */
export const cityFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Max 100 characters'),
  countryId: z.number({ error: 'Select a country' }).int().positive('Select a country'),
  stateId: z.number({ error: 'Select a state' }).int().positive('Select a state'),
});

export type CityFormValues = z.output<typeof cityFormSchema>;

export const emptyCityForm: CityFormValues = { name: '', countryId: 0, stateId: 0 };

export function toCityFormValues(city: City): CityFormValues {
  return { name: city.name, countryId: city.countryId, stateId: city.stateId };
}

export function toCityInput({ name, stateId }: CityFormValues): CityInput {
  return { name, stateId };
}
