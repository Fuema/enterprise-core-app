import { z } from 'zod';
import type { State, StateInput } from '../types/state';

/** Mirrors StateRequest in the API. */
export const stateFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Max 100 characters'),
  countryId: z.number({ error: 'Select a country' }).int().positive('Select a country'),
}) satisfies z.ZodType<StateInput>;

export type StateFormValues = z.output<typeof stateFormSchema>;

export const emptyStateForm: StateFormValues = { name: '', countryId: 0 };

export function toStateFormValues(state: State): StateFormValues {
  return { name: state.name, countryId: state.countryId };
}
