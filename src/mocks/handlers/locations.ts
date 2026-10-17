import { delay, http } from 'msw';
import { z } from 'zod';
import { cities, countries, employees, nextId, states, type MockCity, type MockCountry, type MockState } from '../db';
import { api, noContent, ok, problem, queryParam, readBody } from '../http';
import { listPage } from '../paging';
import { authorize } from './auth';

/**
 * Mock Countries / States / Cities resources, mirroring the API's
 * CountryEndpoints, StateEndpoints and CityEndpoints (routes, permissions,
 * validation messages, 409 "in use" rules, counts).
 */
const LATENCY_MS = 250;

const nameField = z.string().trim().min(1, 'Name is required').max(100, 'Max 100 characters');
const countryInput = z.object({ name: nameField });
const stateInput = z.object({ name: nameField, countryId: z.number().int().positive('Select a country') });
const cityInput = z.object({ name: nameField, stateId: z.number().int().positive('Select a state') });

function validation(errors: Record<string, string[]>): Response {
  return problem(400, 'One or more validation errors occurred.', errors);
}

function zodProblem(error: z.ZodError): Response {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'request';
    errors[key] = [...(errors[key] ?? []), issue.message];
  }
  return validation(errors);
}

function conflict(title: string, detail: string): Response {
  return new Response(JSON.stringify({ type: 'https://httpstatuses.io/409', title, status: 409, detail }), {
    status: 409,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}

const plural = (count: number, one: string, many: string) => `${String(count)} ${count === 1 ? one : many}`;
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const byId = <T extends { id: number }>(rows: readonly T[], id: unknown) => rows.find((row) => String(row.id) === String(id));

// --- DTOs (same shape as the API responses) ---------------------------------

const countryDto = (c: MockCountry) => ({
  id: c.id,
  name: c.name,
  stateCount: states.filter((s) => s.countryId === c.id).length,
  employeeCount: employees.filter((e) => e.countryId === c.id).length,
});

const stateDto = (s: MockState) => ({
  id: s.id,
  name: s.name,
  countryId: s.countryId,
  countryName: byId(countries, s.countryId)?.name ?? '',
  cityCount: cities.filter((c) => c.stateId === s.id).length,
  employeeCount: employees.filter((e) => e.stateId === s.id).length,
});

const cityDto = (c: MockCity) => ({
  id: c.id,
  name: c.name,
  stateId: c.stateId,
  stateName: byId(states, c.stateId)?.name ?? '',
  countryId: c.countryId,
  countryName: byId(countries, c.countryId)?.name ?? '',
  employeeCount: employees.filter((e) => e.cityId === c.id).length,
});

/** Keeps denormalised names on employees in sync after a rename (the API joins at read time). */
function refreshEmployeeNames(): void {
  for (const e of employees) {
    e.countryName = byId(countries, e.countryId)?.name ?? '';
    e.stateName = byId(states, e.stateId)?.name ?? '';
    e.cityName = byId(cities, e.cityId)?.name ?? '';
  }
}

export const locationHandlers = [
  // ---------------------------------------------------------------- countries
  http.get(api('/countries'), async ({ request }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['countries:read']);
    if (auth instanceof Response) return auth;
    return ok(listPage(countries.map(countryDto), new URL(request.url), {
      sortable: ['id', 'name', 'stateCount', 'employeeCount'], searchable: ['name'], defaultSort: 'name',
    }));
  }),
  http.get(api('/countries/:id'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['countries:read']);
    if (auth instanceof Response) return auth;
    const country = byId(countries, params.id);
    return country ? ok(countryDto(country)) : problem(404, 'Country not found');
  }),
  http.post(api('/countries'), async ({ request }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['countries:write']);
    if (auth instanceof Response) return auth;
    const parsed = countryInput.safeParse(await readBody(request));
    if (!parsed.success) return zodProblem(parsed.error);
    if (countries.some((c) => sameName(c.name, parsed.data.name))) {
      return validation({ name: ['A country with this name already exists'] });
    }
    const country: MockCountry = { id: nextId(countries), name: parsed.data.name };
    countries.push(country);
    return ok(countryDto(country), 201);
  }),
  http.put(api('/countries/:id'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['countries:write']);
    if (auth instanceof Response) return auth;
    const country = byId(countries, params.id);
    if (!country) return problem(404, 'Country not found');
    const parsed = countryInput.safeParse(await readBody(request));
    if (!parsed.success) return zodProblem(parsed.error);
    if (countries.some((c) => c.id !== country.id && sameName(c.name, parsed.data.name))) {
      return validation({ name: ['A country with this name already exists'] });
    }
    country.name = parsed.data.name;
    refreshEmployeeNames();
    return ok(countryDto(country));
  }),
  http.delete(api('/countries/:id'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['countries:delete']);
    if (auth instanceof Response) return auth;
    const country = byId(countries, params.id);
    if (!country) return problem(404, 'Country not found');
    const usage = countryDto(country);
    if (usage.stateCount > 0 || usage.employeeCount > 0) {
      return conflict('Country is in use',
        `${country.name} has ${plural(usage.stateCount, 'state', 'states')} and ${plural(usage.employeeCount, 'employee', 'employees')}. Remove or move them first.`);
    }
    countries.splice(countries.indexOf(country), 1);
    return noContent();
  }),

  // ------------------------------------------------------------------- states
  http.get(api('/states'), async ({ request }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['states:read']);
    if (auth instanceof Response) return auth;
    const url = new URL(request.url);
    const countryId = Number(queryParam(url, 'countryId') ?? 0);
    const rows = states.filter((s) => countryId <= 0 || s.countryId === countryId).map(stateDto);
    return ok(listPage(rows, url, {
      sortable: ['id', 'name', 'countryName', 'cityCount', 'employeeCount'], searchable: ['name', 'countryName'], defaultSort: 'name',
    }));
  }),
  http.get(api('/states/:id'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['states:read']);
    if (auth instanceof Response) return auth;
    const state = byId(states, params.id);
    return state ? ok(stateDto(state)) : problem(404, 'State not found');
  }),
  http.post(api('/states'), async ({ request }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['states:write']);
    if (auth instanceof Response) return auth;
    const parsed = stateInput.safeParse(await readBody(request));
    if (!parsed.success) return zodProblem(parsed.error);
    const { name, countryId } = parsed.data;
    if (!byId(countries, countryId)) return validation({ countryId: ['Country not found'] });
    if (states.some((s) => s.countryId === countryId && sameName(s.name, name))) {
      return validation({ name: ['This country already has a state with this name'] });
    }
    const state: MockState = { id: nextId(states), name, countryId };
    states.push(state);
    return ok(stateDto(state), 201);
  }),
  http.put(api('/states/:id'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['states:write']);
    if (auth instanceof Response) return auth;
    const state = byId(states, params.id);
    if (!state) return problem(404, 'State not found');
    const parsed = stateInput.safeParse(await readBody(request));
    if (!parsed.success) return zodProblem(parsed.error);
    const { name, countryId } = parsed.data;
    if (!byId(countries, countryId)) return validation({ countryId: ['Country not found'] });
    if (states.some((s) => s.id !== state.id && s.countryId === countryId && sameName(s.name, name))) {
      return validation({ name: ['This country already has a state with this name'] });
    }
    const usage = stateDto(state);
    if (countryId !== state.countryId && (usage.cityCount > 0 || usage.employeeCount > 0)) {
      return validation({ countryId: ['A state with cities or employees cannot move to another country'] });
    }
    Object.assign(state, { name, countryId });
    refreshEmployeeNames();
    return ok(stateDto(state));
  }),
  http.delete(api('/states/:id'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['states:delete']);
    if (auth instanceof Response) return auth;
    const state = byId(states, params.id);
    if (!state) return problem(404, 'State not found');
    const usage = stateDto(state);
    if (usage.cityCount > 0 || usage.employeeCount > 0) {
      return conflict('State is in use',
        `${state.name} has ${plural(usage.cityCount, 'city', 'cities')} and ${plural(usage.employeeCount, 'employee', 'employees')}. Remove or move them first.`);
    }
    states.splice(states.indexOf(state), 1);
    return noContent();
  }),

  // ------------------------------------------------------------------- cities
  http.get(api('/cities'), async ({ request }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['cities:read']);
    if (auth instanceof Response) return auth;
    const url = new URL(request.url);
    const countryId = Number(queryParam(url, 'countryId') ?? 0);
    const stateId = Number(queryParam(url, 'stateId') ?? 0);
    const rows = cities
      .filter((c) => (countryId <= 0 || c.countryId === countryId) && (stateId <= 0 || c.stateId === stateId))
      .map(cityDto);
    return ok(listPage(rows, url, {
      sortable: ['id', 'name', 'stateName', 'countryName', 'employeeCount'],
      searchable: ['name', 'stateName', 'countryName'],
      defaultSort: 'name',
    }));
  }),
  http.get(api('/cities/:id'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['cities:read']);
    if (auth instanceof Response) return auth;
    const city = byId(cities, params.id);
    return city ? ok(cityDto(city)) : problem(404, 'City not found');
  }),
  http.post(api('/cities'), async ({ request }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['cities:write']);
    if (auth instanceof Response) return auth;
    const parsed = cityInput.safeParse(await readBody(request));
    if (!parsed.success) return zodProblem(parsed.error);
    const state = byId(states, parsed.data.stateId);
    if (!state) return validation({ stateId: ['State not found'] });
    if (cities.some((c) => c.stateId === state.id && sameName(c.name, parsed.data.name))) {
      return validation({ name: ['This state already has a city with this name'] });
    }
    const city: MockCity = { id: nextId(cities), name: parsed.data.name, stateId: state.id, countryId: state.countryId };
    cities.push(city);
    return ok(cityDto(city), 201);
  }),
  http.put(api('/cities/:id'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['cities:write']);
    if (auth instanceof Response) return auth;
    const city = byId(cities, params.id);
    if (!city) return problem(404, 'City not found');
    const parsed = cityInput.safeParse(await readBody(request));
    if (!parsed.success) return zodProblem(parsed.error);
    const state = byId(states, parsed.data.stateId);
    if (!state) return validation({ stateId: ['State not found'] });
    if (cities.some((c) => c.id !== city.id && c.stateId === state.id && sameName(c.name, parsed.data.name))) {
      return validation({ name: ['This state already has a city with this name'] });
    }
    if (state.id !== city.stateId && employees.some((e) => e.cityId === city.id)) {
      return validation({ stateId: ['A city with employees cannot move to another state'] });
    }
    Object.assign(city, { name: parsed.data.name, stateId: state.id, countryId: state.countryId });
    refreshEmployeeNames();
    return ok(cityDto(city));
  }),
  http.delete(api('/cities/:id'), async ({ request, params }) => {
    await delay(LATENCY_MS);
    const auth = authorize(request, ['cities:delete']);
    if (auth instanceof Response) return auth;
    const city = byId(cities, params.id);
    if (!city) return problem(404, 'City not found');
    const employeeCount = employees.filter((e) => e.cityId === city.id).length;
    if (employeeCount > 0) {
      return conflict('City is in use', `${city.name} has ${plural(employeeCount, 'employee', 'employees')}. Move them first.`);
    }
    cities.splice(cities.indexOf(city), 1);
    return noContent();
  }),
];
