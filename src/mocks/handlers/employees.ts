import { delay, http } from 'msw';
import { z } from 'zod';
import { employees, nextEmployeeId, type MockEmployee } from '../db';
import { api, noContent, ok, problem, queryParam, readBody } from '../http';
import { authorize } from './auth';

/**
 * Mock employees resource implementing the template's paging contract:
 *   GET    /employees?page=&pageSize=&search=&sort=lastName.asc,hireDate.desc&department=
 *   GET    /employees/:id
 *   POST   /employees            (employees:write)  -> 400 ProblemDetails on validation errors
 *   PUT    /employees/:id        (employees:write)
 *   DELETE /employees/:id        (employees:delete)
 */
const RESOURCE = '/employees';

const SORTABLE: readonly (keyof MockEmployee)[] = ['id', 'firstName', 'lastName', 'email', 'department', 'jobTitle', 'hireDate', 'isActive'];

const employeeInput = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(50),
  lastName: z.string().trim().min(1, 'Last name is required').max(50),
  email: z.email('Enter a valid email address'),
  department: z.string().trim().min(1, 'Department is required'),
  jobTitle: z.string().trim().min(1, 'Job title is required'),
  hireDate: z.iso.date('Hire date must be YYYY-MM-DD'),
  isActive: z.boolean().default(true),
});

function compare(a: MockEmployee, b: MockEmployee, field: keyof MockEmployee): number {
  const left = a[field];
  const right = b[field];
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right), undefined, { sensitivity: 'base' });
}

function applySort(rows: MockEmployee[], sort: string | null): MockEmployee[] {
  if (!sort) return rows;
  const tokens = sort
    .split(',')
    .map((part) => part.split('.'))
    .filter((pair): pair is [keyof MockEmployee, string] => SORTABLE.includes(pair[0] as keyof MockEmployee));
  if (tokens.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const [field, direction] of tokens) {
      const result = compare(a, b, field);
      if (result !== 0) return direction === 'desc' ? -result : result;
    }
    return 0;
  });
}

function validationProblem(error: z.ZodError): Response {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'request';
    errors[key] = [...(errors[key] ?? []), issue.message];
  }
  return problem(400, 'One or more validation errors occurred.', errors);
}

function emailTaken(email: string, exceptId?: number): boolean {
  return employees.some((e) => e.email.toLowerCase() === email.toLowerCase() && e.id !== exceptId);
}

function findIndex(id: string | readonly string[] | undefined): number {
  return employees.findIndex((e) => String(e.id) === String(id));
}

export const employeeHandlers = [
  http.get(api(RESOURCE), async ({ request }) => {
    await delay(350);
    const auth = authorize(request, ['employees:read']);
    if (auth instanceof Response) return auth;

    const url = new URL(request.url);
    const page = Math.max(1, Number(queryParam(url, 'page') ?? 1) || 1);
    const pageSize = Math.min(500, Math.max(1, Number(queryParam(url, 'pageSize') ?? 20) || 20));
    const search = (queryParam(url, 'search') ?? '').trim().toLowerCase();
    const department = queryParam(url, 'department');

    let rows = employees;
    if (search) {
      rows = rows.filter((e) =>
        [e.firstName, e.lastName, e.email, e.jobTitle].some((value) => value.toLowerCase().includes(search)),
      );
    }
    if (department) rows = rows.filter((e) => e.department === department);
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

  http.post(api(RESOURCE), async ({ request }) => {
    await delay(400);
    const auth = authorize(request, ['employees:write']);
    if (auth instanceof Response) return auth;
    const parsed = employeeInput.safeParse(await readBody(request));
    if (!parsed.success) return validationProblem(parsed.error);
    if (emailTaken(parsed.data.email)) {
      return problem(400, 'One or more validation errors occurred.', { email: ['This email is already in use'] });
    }
    const created: MockEmployee = { id: nextEmployeeId(), ...parsed.data };
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
    const parsed = employeeInput.safeParse(await readBody(request));
    if (!parsed.success) return validationProblem(parsed.error);
    if (emailTaken(parsed.data.email, current.id)) {
      return problem(400, 'One or more validation errors occurred.', { email: ['This email is already in use'] });
    }
    const updated: MockEmployee = { ...current, ...parsed.data };
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
