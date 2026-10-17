import { lookupQueries } from '@/services/lookupService';

/**
 * Location dropdown data shared by every feature that references a place
 * (employees, states, cities). Backed by the read-only GET /lookups/* endpoints,
 * which any signed-in user may call; managing the data needs the
 * countries / states / cities permissions.
 *
 * This file is the ONLY public surface of `features/locations` for other features.
 */
export const locationLookups = {
  countries: () => lookupQueries.list('/lookups/countries'),
  states: (countryId: number | undefined) =>
    lookupQueries.list(`/lookups/countries/${String(countryId ?? 0)}/states`, (countryId ?? 0) > 0),
  cities: (stateId: number | undefined) =>
    lookupQueries.list(`/lookups/states/${String(stateId ?? 0)}/cities`, (stateId ?? 0) > 0),
};
