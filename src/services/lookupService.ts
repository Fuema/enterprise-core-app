import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient, unwrapEnvelope } from '@/lib/apiClient';

/**
 * Generic read-only lookups (countries, states, categories...): every lookup
 * endpoint returns `[{ id, name }]`, so one schema, one query factory and one
 * <LookupSelect> cover them all.
 *
 * @example
 * const { data } = useQuery(lookupQueries.list('/countries'));
 * const states = useQuery(lookupQueries.list(`/countries/${countryId}/states`, countryId > 0));
 */
export const lookupItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

export type LookupItem = z.output<typeof lookupItemSchema>;

const lookupListSchema = z.array(lookupItemSchema);

/** Lookups change rarely: keep them fresh for 10 minutes, cached for 30. */
const LOOKUP_STALE_TIME_MS = 10 * 60_000;
const LOOKUP_GC_TIME_MS = 30 * 60_000;

export async function fetchLookup(path: string, signal?: AbortSignal): Promise<LookupItem[]> {
  const response = await apiClient.get<unknown>(path, { signal });
  return lookupListSchema.parse(unwrapEnvelope(response.data));
}

export const lookupQueries = {
  all: ['lookup'] as const,
  /** `enabled: false` for a dependent lookup whose parent is not chosen yet (cascades). */
  list: (path: string, enabled = true) =>
    queryOptions({
      queryKey: ['lookup', path] as const,
      queryFn: ({ signal }) => fetchLookup(path, signal),
      enabled,
      staleTime: LOOKUP_STALE_TIME_MS,
      gcTime: LOOKUP_GC_TIME_MS,
    }),
};
