import { z } from 'zod';
import type { SortableField } from '@/types/generic-api';

/** Mirrors CityResponse in the API. The country is always the state's country. */
export const citySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  stateId: z.number().int(),
  stateName: z.string().default(''),
  countryId: z.number().int(),
  countryName: z.string().default(''),
  employeeCount: z.number().int().default(0),
});

export type City = z.output<typeof citySchema>;
export type CityId = City['id'];

/** Payload for POST and PUT (CityRequest): the API derives the country from the state. */
export interface CityInput {
  name: string;
  stateId: number;
}

export const CITY_SORTABLE_FIELDS = ['name', 'stateName', 'countryName', 'employeeCount'] as const satisfies readonly SortableField<City>[];

/** Must match Auth/Permissions.cs in the API. */
export const CITY_PERMISSIONS = {
  read: 'cities:read',
  write: 'cities:write',
  delete: 'cities:delete',
} as const;
