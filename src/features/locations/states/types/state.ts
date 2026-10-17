import { z } from 'zod';
import type { SortableField } from '@/types/generic-api';

/** Mirrors StateResponse in the API. */
export const stateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  countryId: z.number().int(),
  countryName: z.string().default(''),
  cityCount: z.number().int().default(0),
  employeeCount: z.number().int().default(0),
});

export type State = z.output<typeof stateSchema>;
export type StateId = State['id'];

/** Payload for POST and PUT (StateRequest). */
export interface StateInput {
  name: string;
  countryId: number;
}

export const STATE_SORTABLE_FIELDS = ['name', 'countryName', 'cityCount', 'employeeCount'] as const satisfies readonly SortableField<State>[];

/** Must match Auth/Permissions.cs in the API. */
export const STATE_PERMISSIONS = {
  read: 'states:read',
  write: 'states:write',
  delete: 'states:delete',
} as const;
