import { delay, http } from 'msw';
import { z } from 'zod';
import { cities, employees, locationNames, nextEmployeeId, type MockEmployee } from '../db';
import { api, noContent, ok, problem, queryParam, readBody } from '../http';
import { authorize } from './auth';

/**
 * Mock employees resource, behaviourally identical to the .NET API
 * (enterprise-core-app-claude-server, Endpoint/EmployeeEndpoints.cs):
 *   GET    /employees?page=&pageSize=&search=&sort=lastName.asc,dateOfBirth.desc&gender=&countryId=
 *   GET    /employees/:id
 *   POST   /employees               (employees:write)  -> 201; 400 ProblemDetails on validation errors
 *   PUT    /employees/:id           (employees:write)  -> 200 + entity
 *   DELETE /employees/:id           (employees:delete) -> 204
 *   POST   /employees/bulk-delete   (employees:delete) { ids } -> { deletedCount }
 */
const RESOURCE = '/employees';
const MAX_PAGE_SIZE = 100;
const DUPLICATE_EMAIL = 'This email is already in use';

const SORTABLE: readonly (keyof MockEmployee)[] = [
  'id', 'firstName', 'lastName', 'email', 'dateOfBirth', 'gender', 'countryName', 'stateName', 'cityName', 'pincode',
];
const SEARCHABLE: readonly (keyof MockEmployee)[] = ['firstName', 'lastName', 'email', 'cityName', 'stateName', 'countryName', 'pincode'];

/** Same rules and messages as EmployeeRequest (DataAnnotations) in the API. */
const employeeInput = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(50, 'Max 50 characters'),
  lastName: z.string().trim().min(1, 'Last name is required').max(50, 'Max 50 characters'),
  dateOfBirth: z.iso.date('Date of birth is required'),
  email: z.email('Enter a valid email address').max(100, 'Max 100 characters'),
  gender: z.enum(['Male', 'Female'], { error: 'Select a gender' }),
  countryId: z.number().int().positive('Select a country'),
  stateId: z.number().int().positive('Select a state'),
  cityId: z.number().int().positive('Select a city'),
  address: z.string().trim().min(1, 'Address is required').max(100, 'Max 100 characters'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
});
type EmployeeInput = z.output<typeof employeeInput>;

const bulkDeleteInput = z.object({
  ids: z.array(z.number().int()).min(1, 'Select at least one employee').max(500, 'At most 500 employees per request'),
});

function compare(a: MockEmployee, b: MockEmployee, field: keyof MockEmployee): number {
  const left = a[field];
  const right = b[field];
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right), undefined, { sensitivity: 'base' });
}

function applySort(rows: MockEmployee[], sort: string | null): MockEmployee[] {
  const tokens = (sort ?? '')
    .split(',')
    .map((part) => part.split('.'))
    .filter((pair): pair is [keyof MockEmployee, string] => SORTABLE.includes(pair[0] as keyof MockEmployee))
    .slice(0, 5);
  // Default sort + id tie-breaker, like the API.
  const effective: [keyof MockEmployee, string][] = tokens.length > 0 ? tokens : [['lastName', 'asc']];
  return [...rows].sort((a, b) => {
    for (const [field, direction] of effective) {
      const result = compare(a, b, field);
      if (result !== 0) return direction === 'desc' ? -result : result;
    }
    return a.id - b.id;
  });
}

function validationProblem(errors: Record<string, string[]>): Response {
  return problem(400, 'One or more validation errors occurred.', errors);
}

function zodErrors(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'request';
    errors[key] = [...(errors[key] ?? []), issue.message];
  }
  return errors;
}

/** Cross-field rules (EmployeeEndpoints.ValidateRulesAsync). */
function ruleErrors(input: EmployeeInput, exceptId?: number): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  if (input.dateOfBirth > new Date().toISOString().slice(0, 10)) {
    errors.dateOfBirth = ['Date of birth cannot be in the future'];
  }
  const locationIsValid = cities.some(
    (c) => c.id === input.cityId && c.stateId === input.stateId && c.countryId === input.countryId,
  );
  if (!locationIsValid) errors.cityId = ['The selected country, state and city do not match'];
  if (employees.some((e) => e.email.toLowerCase() === input.email.toLowerCase() && e.id !== exceptId)) {
    errors.email = [DUPLICATE_EMAIL];
  }
  return errors;
}

function toEntity(id: number, input: EmployeeInput): MockEmployee {
  return { id, ...input, ...locationNames(input.countryId, input.stateId, input.cityId) };
}

function findIndex(id: string | readonly string[] | undefined): number {
  return employees.findIndex((e) => String(e.id) === String(id));
}

async function parseInput(request: Request): Promise<EmployeeInput | Response> {
  const parsed = employeeInput.safeParse(await readBody(request));
  return parsed.success ? parsed.data : validationProblem(zodErrors(parsed.error));
}

export const employeeHandlers = [
  http.get(api(RESOURCE), async ({ request }) => {
    await delay(350);
    const auth = authorize(request, ['employees:read']);
    if (auth instanceof Response) return auth;

    const url = new URL(request.url);
    const page = Math.max(1, Number(queryParam(url, 'page') ?? 1) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(queryParam(url, 'pageSize') ?? 20) || 20));
    const terms = (queryParam(url, 'search') ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 5);
    const gender = queryParam(url, 'gender');
    const countryId = Number(queryParam(url, 'countryId') ?? 0);

    let rows = employees;
    for (const term of terms) {
      rows = rows.filter((e) => SEARCHABLE.some((field) => String(e[field]).toLowerCase().includes(term)));
    }
    if (gender) rows = rows.filter((e) => e.gender === gender);
    if (countryId > 0) rows = rows.filter((e) => e.countryId === countryId);
    rows = applySort(rows, queryParam(url, 'sort'));

    const start = (page - 1) * pageSize;
    return ok({ data: rows.slice(start, start + pageSize), totalCount: rows.length, pageSize, currentPage: page });
  }),

  http.get(api(`${RESOURCE}/:id`), async ({ request, params }) => {
    await delay(200);
    const auth = authorize(request, ['employees:read']);
    if (auth instanceof Response) return auth;
    const employee = employees[findIndex(params.id)];
    return employee ? ok(employee) : problem(404, 'Employee not found');
  }),

  http.post(api(`${RESOURCE}/bulk-delete`), async ({ request }) => {
    await delay(400);
    const auth = authorize(request, ['employees:delete']);
    if (auth instanceof Response) return auth;
    const parsed = bulkDeleteInput.safeParse(await readBody(request));
    if (!parsed.success) return validationProblem(zodErrors(parsed.error));
    const ids = new Set(parsed.data.ids);
    let deletedCount = 0;
    for (let i = employees.length - 1; i >= 0; i -= 1) {
      const employee = employees[i];
      if (employee && ids.has(employee.id)) {
        employees.splice(i, 1);
        deletedCount += 1;
      }
    }
    return ok({ deletedCount });
  }),

  http.post(api(RESOURCE), async ({ request }) => {
    await delay(400);
    const auth = authorize(request, ['employees:write']);
    if (auth instanceof Response) return auth;
    const input = await parseInput(request);
    if (input instanceof Response) return input;
    const errors = ruleErrors(input);
    if (Object.keys(errors).length > 0) return validationProblem(errors);
    const created = toEntity(nextEmployeeId(), input);
    employees.unshift(created);
    return ok(created, 201);
  }),

  http.put(api(`${RESOURCE}/:id`), async ({ request, params }) => {
    await delay(400);
    const auth = authorize(request, ['employees:write']);
    if (auth instanceof Response) return auth;
    const index = findIndex(params.id);
    const current = employees[index];
    if (!current) return problem(404, 'Employee not found');
    const input = await parseInput(request);
    if (input instanceof Response) return input;
    const errors = ruleErrors(input, current.id);
    if (Object.keys(errors).length > 0) return validationProblem(errors);
    const updated = toEntity(current.id, input);
    employees[index] = updated;
    return ok(updated);
  }),

  http.delete(api(`${RESOURCE}/:id`), async ({ request, params }) => {
    await delay(300);
    const auth = authorize(request, ['employees:delete']);
    if (auth instanceof Response) return auth;
    const index = findIndex(params.id);
    if (index === -1) return problem(404, 'Employee not found');
    employees.splice(index, 1);
    return noContent();
  }),
];
