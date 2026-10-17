import { describe, expect, it } from 'vitest';
import {
  camelToPascal,
  camelToSnake,
  createCasingMapper,
  normalizeFieldPath,
  pascalToCamel,
  snakeToCamel,
  transformKeys,
} from './casing';

describe('key transforms', () => {
  it.each([
    ['FirstName', 'firstName'],
    ['IDNumber', 'idNumber'],
    ['URL', 'url'],
    ['Id', 'id'],
    ['alreadyCamel', 'alreadyCamel'],
  ])('pascalToCamel(%s) = %s', (input, expected) => {
    expect(pascalToCamel(input)).toBe(expected);
  });

  it.each([
    ['first_name', 'firstName'],
    ['a_b_c', 'aBC'],
    ['_private', '_private'],
    ['address_line_1', 'addressLine1'],
  ])('snakeToCamel(%s) = %s', (input, expected) => {
    expect(snakeToCamel(input)).toBe(expected);
  });

  it.each([
    ['firstName', 'first_name'],
    ['employeeID', 'employee_id'],
    ['addressLine1', 'address_line1'],
  ])('camelToSnake(%s) = %s', (input, expected) => {
    expect(camelToSnake(input)).toBe(expected);
  });

  it('camelToPascal', () => {
    expect(camelToPascal('firstName')).toBe('FirstName');
  });
});

describe('transformKeys', () => {
  it('transforms nested objects and arrays but leaves Dates untouched', () => {
    const date = new Date(0);
    const result = transformKeys({ FirstName: 'Ann', Items: [{ UnitPrice: 1 }], CreatedAt: date }, pascalToCamel);
    expect(result).toEqual({ firstName: 'Ann', items: [{ unitPrice: 1 }], createdAt: date });
    expect((result as { createdAt: Date }).createdAt).toBe(date);
  });
});

describe('createCasingMapper', () => {
  it('round-trips pascal', () => {
    const mapper = createCasingMapper('pascal');
    expect(mapper.toApi({ firstName: 'a' })).toEqual({ FirstName: 'a' });
    expect(mapper.fromApi({ FirstName: 'a' })).toEqual({ firstName: 'a' });
  });

  it('round-trips snake', () => {
    const mapper = createCasingMapper('snake');
    expect(mapper.toApi({ firstName: 'a' })).toEqual({ first_name: 'a' });
    expect(mapper.fromApi({ first_name: 'a' })).toEqual({ firstName: 'a' });
  });

  it('is a no-op for camel', () => {
    const value = { firstName: 'a' };
    expect(createCasingMapper('camel').toApi(value)).toBe(value);
  });
});

describe('normalizeFieldPath', () => {
  it('maps ASP.NET style paths to React Hook Form paths', () => {
    expect(normalizeFieldPath('Address.City', pascalToCamel)).toBe('address.city');
    expect(normalizeFieldPath('Items[0].UnitPrice', pascalToCamel)).toBe('items.0.unitPrice');
    expect(normalizeFieldPath('$.Name', pascalToCamel)).toBe('$.name');
  });
});
