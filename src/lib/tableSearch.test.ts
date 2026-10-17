import { describe, expect, it } from 'vitest';
import { createTableSearchSchema, parseSelected, parseSort, serializeSort, toTableFilter } from './tableSearch';

interface Person {
  id: string;
  lastName: string;
  hireDate: string;
}

const schema = createTableSearchSchema(['lastName', 'hireDate'] as const, { defaultPageSize: 20 });

describe('createTableSearchSchema', () => {
  it('applies defaults to an empty URL', () => {
    expect(schema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('accepts a valid state', () => {
    expect(schema.parse({ page: 3, pageSize: 50, search: 'ann', sort: 'lastName.asc,hireDate.desc' })).toEqual({
      page: 3,
      pageSize: 50,
      search: 'ann',
      sort: 'lastName.asc,hireDate.desc',
    });
  });

  it('recovers from tampered values instead of throwing', () => {
    expect(schema.parse({ page: -4, pageSize: 99999, sort: 'password.asc' })).toEqual({ page: 1, pageSize: 20 });
  });

  it('coerces numeric search terms to strings', () => {
    expect(schema.parse({ search: 123 }).search).toBe('123');
  });
});

describe('sort helpers', () => {
  it('parses only allowed fields', () => {
    expect(parseSort('lastName.desc,secret.asc', ['lastName'])).toEqual([{ field: 'lastName', direction: 'desc' }]);
  });

  it('serializes back to the URL format', () => {
    expect(serializeSort([{ field: 'lastName', direction: 'asc' }])).toBe('lastName.asc');
    expect(serializeSort([])).toBeUndefined();
  });
});

describe('toTableFilter', () => {
  it('builds a typed GenericTableFilter', () => {
    const filter = toTableFilter<Person>({ page: 2, pageSize: 10, sort: 'hireDate.desc' }, ['lastName', 'hireDate']);
    expect(filter).toEqual({ page: 2, pageSize: 10, sort: [{ field: 'hireDate', direction: 'desc' }] });
  });
});

describe('parseSelected', () => {
  it('splits ids', () => {
    expect(parseSelected('1,2,,3')).toEqual(['1', '2', '3']);
    expect(parseSelected(undefined)).toEqual([]);
  });
});
