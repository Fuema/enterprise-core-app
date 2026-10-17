/**
 * In-memory "database" for the mock backend. Deterministic (seeded), reset on
 * every page reload. Shapes here are BACKEND DTOs, independent of any
 * frontend feature types.
 */

export interface MockUser {
  id: number;
  username: string;
  password: string;
  displayName: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface MockEmployee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  jobTitle: string;
  hireDate: string;
  isActive: boolean;
}

/** Demo accounts: username / password are identical. */
export const users: MockUser[] = [
  {
    id: 1,
    username: 'admin',
    password: 'admin',
    displayName: 'Ada Admin',
    email: 'admin@example.test',
    roles: ['Administrator'],
    permissions: ['*'],
  },
  {
    id: 2,
    username: 'manager',
    password: 'manager',
    displayName: 'Max Manager',
    email: 'manager@example.test',
    roles: ['HR Manager'],
    permissions: ['employees:read', 'employees:write'],
  },
  {
    id: 3,
    username: 'viewer',
    password: 'viewer',
    displayName: 'Vera Viewer',
    email: 'viewer@example.test',
    roles: ['Auditor'],
    permissions: ['employees:read'],
  },
];

// ---------------------------------------------------------------------------
// Seeded employee generator
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ['Ana', 'Ben', 'Carla', 'Diego', 'Elena', 'Frank', 'Grace', 'Hugo', 'Iris', 'Jorge', 'Kara', 'Liam', 'Maya', 'Noah', 'Olga', 'Pablo', 'Rosa', 'Sam', 'Tara', 'Victor'];
const LAST = ['Alvarez', 'Brooks', 'Castillo', 'Dunn', 'Ellis', 'Fuentes', 'Garcia', 'Hayes', 'Ibarra', 'Jensen', 'Kim', 'Lopez', 'Moreno', 'Nash', 'Ortiz', 'Patel', 'Reyes', 'Silva', 'Torres', 'Vega'];
const DEPARTMENTS: Record<string, string[]> = {
  Engineering: ['Software Engineer', 'Senior Engineer', 'QA Analyst', 'DevOps Engineer'],
  'Human Resources': ['HR Generalist', 'Recruiter', 'Benefits Specialist'],
  Payroll: ['Payroll Specialist', 'Payroll Manager'],
  Finance: ['Accountant', 'Financial Analyst'],
  Sales: ['Account Executive', 'Sales Manager'],
};
const DEPARTMENT_NAMES = Object.keys(DEPARTMENTS);

function pick<T>(random: () => number, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error('pick() on an empty list');
  return item;
}

function seedEmployees(count: number): MockEmployee[] {
  const random = mulberry32(20261017);
  const result: MockEmployee[] = [];
  for (let id = 1; id <= count; id += 1) {
    const firstName = pick(random, FIRST);
    const lastName = pick(random, LAST);
    const department = pick(random, DEPARTMENT_NAMES);
    const hire = new Date(Date.UTC(2012 + Math.floor(random() * 14), Math.floor(random() * 12), 1 + Math.floor(random() * 28)));
    result.push({
      id,
      firstName,
      lastName,
      email: `${firstName}.${lastName}${String(id)}@example.test`.toLowerCase(),
      department,
      jobTitle: pick(random, DEPARTMENTS[department] ?? ['Associate']),
      hireDate: hire.toISOString().slice(0, 10),
      isActive: random() > 0.12,
    });
  }
  return result;
}

export const employees: MockEmployee[] = seedEmployees(137);

export function nextEmployeeId(): number {
  return employees.reduce((max, e) => Math.max(max, e.id), 0) + 1;
}

export const departments: readonly string[] = DEPARTMENT_NAMES;
