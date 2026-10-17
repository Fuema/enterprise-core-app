/**
 * Property-casing translation between the backend wire format and the app.
 * The app ALWAYS works in camelCase; the backend casing comes from
 * VITE_API_PROPERTY_CASING and is applied only inside the API client.
 * Pure module: no imports, fully unit-tested.
 */

export type PropertyCasing = 'camel' | 'pascal' | 'snake' | 'none';

type KeyTransform = (key: string) => string;

const identity: KeyTransform = (key) => key;

/** "FirstName" -> "firstName", "IDNumber" -> "idNumber", "URL" -> "url". */
export const pascalToCamel: KeyTransform = (key) => {
  const run = /^[A-Z]+/.exec(key)?.[0];
  if (!run) return key;
  if (run.length === key.length) return key.toLowerCase();
  if (run.length === 1) return run.toLowerCase() + key.slice(1);
  return run.slice(0, -1).toLowerCase() + key.slice(run.length - 1);
};

/** "firstName" -> "FirstName". */
export const camelToPascal: KeyTransform = (key) =>
  key.length === 0 ? key : key.charAt(0).toUpperCase() + key.slice(1);

/** "first_name" -> "firstName" (leading underscores are preserved). */
export const snakeToCamel: KeyTransform = (key) =>
  key.replace(/(?<=[a-zA-Z0-9])_+([a-zA-Z0-9])/g, (_match, next: string) => next.toUpperCase());

/** "firstName" -> "first_name", "employeeID" -> "employee_id". */
export const camelToSnake: KeyTransform = (key) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Recursively renames keys of plain objects/arrays. Dates, Files, Blobs, FormData are left untouched. */
export function transformKeys(value: unknown, transform: KeyTransform): unknown {
  if (Array.isArray(value)) return value.map((item) => transformKeys(item, transform));
  if (!isPlainObject(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    result[transform(key)] = transformKeys(inner, transform);
  }
  return result;
}

export interface CasingMapper {
  /** App (camelCase) -> backend casing. */
  toApi: (value: unknown) => unknown;
  /** Backend casing -> app (camelCase). */
  fromApi: (value: unknown) => unknown;
  /** Single key/path segment backend -> app (used for field-error mapping). */
  keyFromApi: KeyTransform;
}

export function createCasingMapper(apiCasing: PropertyCasing): CasingMapper {
  const [outbound, inbound]: [KeyTransform, KeyTransform] = (() => {
    switch (apiCasing) {
      case 'pascal':
        return [camelToPascal, pascalToCamel];
      case 'snake':
        return [camelToSnake, snakeToCamel];
      case 'camel':
      case 'none':
        return [identity, identity];
    }
  })();

  return {
    toApi: (value) => (outbound === identity ? value : transformKeys(value, outbound)),
    fromApi: (value) => (inbound === identity ? value : transformKeys(value, inbound)),
    // Field paths always normalise to camelCase so they match form field names.
    keyFromApi: apiCasing === 'snake' ? snakeToCamel : pascalToCamel,
  };
}

/**
 * Normalises a server field path to a React Hook Form path:
 * "Address.City" -> "address.city", "Items[0].Name" -> "items.0.name".
 */
export function normalizeFieldPath(path: string, keyFromApi: KeyTransform): string {
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter((segment) => segment.length > 0)
    .map((segment) => (/^\d+$/.test(segment) ? segment : keyFromApi(segment)))
    .join('.');
}
