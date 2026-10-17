import { z } from 'zod';
import type { SortableField } from '@/types/generic-api';

/** Mirrors CountryResponse in the API. Counts are read-only usage figures. */
export const countrySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  stateCount: z.number().int().default(0),
  employeeCount: z.number().int().default(0),
});

export type Country = z.output<typeof countrySchema>;
export type CountryId = Country['id'];

/** Payload for POST and PUT (CountryRequest). */
export interface CountryInput {
  name: string;
}

export const COUNTRY_SORTABLE_FIELDS = ['name', 'stateCount', 'employeeCount'] as const satisfies readonly SortableField<Country>[];

/** Must match Auth/Permissions.cs in the API. */
export const COUNTRY_PERMISSIONS = {
  read: 'countries:read',
  write: 'countries:write',
  delete: 'countries:delete',
} as const;
