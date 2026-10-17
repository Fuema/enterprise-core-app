import { delay, http } from 'msw';
import { cities, countries, states } from '../db';
import { api, ok } from '../http';
import { authorize } from './auth';

/**
 * Mock location lookups, same routes and `[{ id, name }]` shape as
 * Endpoint/LookupEndpoints.cs in the .NET API. Any signed-in user may read.
 */
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
const toItem = ({ id, name }: { id: number; name: string }) => ({ id, name });

export const lookupHandlers = [
  http.get(api('/lookups/countries'), async ({ request }) => {
    await delay(120);
    const auth = authorize(request);
    if (auth instanceof Response) return auth;
    return ok([...countries].sort(byName).map(toItem));
  }),

  http.get(api('/lookups/countries/:countryId/states'), async ({ request, params }) => {
    await delay(120);
    const auth = authorize(request);
    if (auth instanceof Response) return auth;
    const countryId = Number(params.countryId);
    return ok(states.filter((s) => s.countryId === countryId).sort(byName).map(toItem));
  }),

  http.get(api('/lookups/states/:stateId/cities'), async ({ request, params }) => {
    await delay(120);
    const auth = authorize(request);
    if (auth instanceof Response) return auth;
    const stateId = Number(params.stateId);
    return ok(cities.filter((c) => c.stateId === stateId).sort(byName).map(toItem));
  }),
];
