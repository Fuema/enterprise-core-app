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
  /** Effective access = permissions of these roles + directPermissions (API: AccessService). */
  roleIds: number[];
  directPermissions: string[];
  /** Inactive accounts cannot sign in or refresh (API: AppUser.IsActive). */
  isActive: boolean;
  createdAtUtc: string;
  failedLoginCount: number;
  lockoutEndUtc: string | null;
  mustChangePassword: boolean;
  lastLoginAtUtc: string | null;
  passwordChangedAtUtc: string | null;
}

export interface MockRole {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface MockAuditEntry {
  id: number;
  occurredAtUtc: string;
  actorUserId: number | null;
  actorName: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  targetName: string | null;
  details: string | null;
  ipAddress: string | null;
}

/** Same shape as EmployeeResponse in the .NET API. */
export interface MockEmployee {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  gender: 'Male' | 'Female';
  countryId: number;
  stateId: number;
  cityId: number;
  address: string;
  pincode: string;
  countryName: string;
  stateName: string;
  cityName: string;
}

export interface MockCountry {
  id: number;
  name: string;
}
export interface MockState {
  id: number;
  name: string;
  countryId: number;
}
export interface MockCity {
  id: number;
  name: string;
  stateId: number;
  countryId: number;
}

/** Roles (API: dbo.Roles + RolePermissions). Administrator is the locked system role. */
export const roles: MockRole[] = [
  { id: 1, name: 'Administrator', description: 'Full access to every feature, including future ones', isSystem: true, permissions: ['*'], createdAtUtc: '2026-01-01T00:00:00Z', updatedAtUtc: null },
  {
    id: 2,
    name: 'HR Manager',
    description: 'Manages employees and cities; reads countries and states',
    isSystem: false,
    permissions: ['employees:read', 'employees:write', 'countries:read', 'states:read', 'cities:read', 'cities:write'],
    createdAtUtc: '2026-01-01T00:00:00Z',
    updatedAtUtc: null,
  },
  { id: 3, name: 'Auditor', description: 'Read-only access to employees', isSystem: false, permissions: ['employees:read'], createdAtUtc: '2026-01-01T00:00:00Z', updatedAtUtc: null },
  { id: 4, name: 'User', description: 'Default role of self-registered accounts', isSystem: false, permissions: ['employees:read'], createdAtUtc: '2026-01-01T00:00:00Z', updatedAtUtc: null },
];

function seedUser(id: number, username: string, displayName: string, roleId: number, createdAtUtc: string): MockUser {
  return {
    id,
    username,
    password: username,
    displayName,
    email: `${username}@example.test`,
    roleIds: [roleId],
    directPermissions: [],
    isActive: true,
    createdAtUtc,
    failedLoginCount: 0,
    lockoutEndUtc: null,
    mustChangePassword: false,
    lastLoginAtUtc: null,
    passwordChangedAtUtc: null,
  };
}

/** Demo accounts: username / password are identical. Signup and "New user" append (until reload). */
export const users: MockUser[] = [
  seedUser(1, 'admin', 'Ada Admin', 1, '2026-01-05T09:00:00Z'),
  // Edits employees and cities; only looks at countries and states (same as the API's seeded manager).
  seedUser(2, 'manager', 'Max Manager', 2, '2026-02-10T09:00:00Z'),
  seedUser(3, 'viewer', 'Vera Viewer', 3, '2026-03-15T09:00:00Z'),
];

export const auditLog: MockAuditEntry[] = [];

/** Roles of a user, by name order. */
export function rolesOf(user: MockUser): MockRole[] {
  return roles.filter((role) => user.roleIds.includes(role.id)).sort((a, b) => a.name.localeCompare(b.name));
}

/** API: AccessService.Effective — distinct, "*" first, then alphabetical. */
export function effectivePermissions(user: MockUser): string[] {
  const all = new Set([...rolesOf(user).flatMap((role) => role.permissions), ...user.directPermissions]);
  return [...all].sort((a, b) => (a === '*' ? -1 : b === '*' ? 1 : a.localeCompare(b)));
}

export function isLockedOut(user: MockUser, now = Date.now()): boolean {
  return user.lockoutEndUtc !== null && new Date(user.lockoutEndUtc).getTime() > now;
}

/** API: AuditService.Record (newest first when listed). */
export function recordAudit(entry: Omit<MockAuditEntry, 'id' | 'occurredAtUtc' | 'ipAddress' | 'details'> & { details?: unknown }): void {
  auditLog.push({
    ...entry,
    id: auditLog.length + 1,
    occurredAtUtc: new Date().toISOString(),
    ipAddress: '127.0.0.1',
    details: entry.details === undefined ? null : JSON.stringify(entry.details),
  });
}

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

export const countries: MockCountry[] = [
  { id: 1, name: 'India' },
  { id: 2, name: 'United States' },
  { id: 3, name: 'Canada' },
];

export const states: MockState[] = [
  { id: 1, name: 'Maharashtra', countryId: 1 },
  { id: 2, name: 'Karnataka', countryId: 1 },
  { id: 3, name: 'Tamil Nadu', countryId: 1 },
  { id: 4, name: 'California', countryId: 2 },
  { id: 5, name: 'Texas', countryId: 2 },
  { id: 6, name: 'Ontario', countryId: 3 },
  { id: 7, name: 'British Columbia', countryId: 3 },
];

export const cities: MockCity[] = [
  { id: 1, name: 'Mumbai', stateId: 1, countryId: 1 },
  { id: 2, name: 'Pune', stateId: 1, countryId: 1 },
  { id: 3, name: 'Bengaluru', stateId: 2, countryId: 1 },
  { id: 4, name: 'Mysuru', stateId: 2, countryId: 1 },
  { id: 5, name: 'Chennai', stateId: 3, countryId: 1 },
  { id: 6, name: 'Coimbatore', stateId: 3, countryId: 1 },
  { id: 7, name: 'Los Angeles', stateId: 4, countryId: 2 },
  { id: 8, name: 'San Francisco', stateId: 4, countryId: 2 },
  { id: 9, name: 'Austin', stateId: 5, countryId: 2 },
  { id: 10, name: 'Houston', stateId: 5, countryId: 2 },
  { id: 11, name: 'Toronto', stateId: 6, countryId: 3 },
  { id: 12, name: 'Ottawa', stateId: 6, countryId: 3 },
  { id: 13, name: 'Vancouver', stateId: 7, countryId: 3 },
  { id: 14, name: 'Victoria', stateId: 7, countryId: 3 },
];

/** Grantable scopes (API: Permissions.All, served by GET /lookups/permissions). */
export const PERMISSION_CATALOG: readonly string[] = [
  'employees:read', 'employees:write', 'employees:delete',
  'countries:read', 'countries:write', 'countries:delete',
  'states:read', 'states:write', 'states:delete',
  'cities:read', 'cities:write', 'cities:delete',
  'users:read', 'users:write',
  'roles:read', 'roles:write', 'roles:delete',
  'audit:read',
];

/** Self-service signup default role (API: Signup:DefaultRole). */
export const SIGNUP_DEFAULT_ROLE = 'User';

/** Lockout policy (API: Security section). */
export const SECURITY = { maxFailedLoginAttempts: 5, lockoutMinutes: 15 } as const;

/** API: Permissions.IsGrantable. */
export function isGrantable(value: string): boolean {
  if (value === '*' || PERMISSION_CATALOG.includes(value)) return true;
  if (!value.endsWith(':*')) return false;
  const resource = value.slice(0, -2);
  return PERMISSION_CATALOG.some((scope) => scope.startsWith(`${resource}:`));
}

export function nextId(rows: readonly { id: number }[]): number {
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}

/** Lookup names for a location (empty strings when a reference is broken, like the API's LEFT JOINs). */
export function locationNames(countryId: number, stateId: number, cityId: number) {
  return {
    countryName: countries.find((c) => c.id === countryId)?.name ?? '',
    stateName: states.find((s) => s.id === stateId)?.name ?? '',
    cityName: cities.find((c) => c.id === cityId)?.name ?? '',
  };
}

const FIRST = ['Ana', 'Ben', 'Carla', 'Diego', 'Elena', 'Frank', 'Grace', 'Hugo', 'Iris', 'Jorge', 'Kara', 'Liam', 'Maya', 'Noah', 'Olga', 'Pablo', 'Rosa', 'Sam', 'Tara', 'Victor'];
const LAST = ['Alvarez', 'Brooks', 'Castillo', 'Dunn', 'Ellis', 'Fuentes', 'Garcia', 'Hayes', 'Ibarra', 'Jensen', 'Kim', 'Lopez', 'Moreno', 'Nash', 'Ortiz', 'Patel', 'Reyes', 'Silva', 'Torres', 'Vega'];
const FEMALE = new Set(['Ana', 'Carla', 'Elena', 'Grace', 'Iris', 'Kara', 'Maya', 'Olga', 'Rosa', 'Tara']);
const STREETS = ['MG Road', 'Main Street', 'Park Avenue', 'Lake View', 'Station Road', 'Hill Crest', 'Market Lane'];

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
    const city = pick(random, cities);
    const born = new Date(Date.UTC(1965 + Math.floor(random() * 38), Math.floor(random() * 12), 1 + Math.floor(random() * 28)));
    result.push({
      id,
      firstName,
      lastName,
      dateOfBirth: born.toISOString().slice(0, 10),
      email: `${firstName}.${lastName}${String(id)}@example.test`.toLowerCase(),
      gender: FEMALE.has(firstName) ? 'Female' : 'Male',
      countryId: city.countryId,
      stateId: city.stateId,
      cityId: city.id,
      address: `${String(1 + Math.floor(random() * 250))} ${pick(random, STREETS)}`,
      pincode: String(100000 + Math.floor(random() * 900000)),
      ...locationNames(city.countryId, city.stateId, city.id),
    });
  }
  return result;
}

export const employees: MockEmployee[] = seedEmployees(137);

export function nextEmployeeId(): number {
  return employees.reduce((max, e) => Math.max(max, e.id), 0) + 1;
}
