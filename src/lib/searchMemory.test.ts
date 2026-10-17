import { describe, expect, it } from 'vitest';
import { createSearchMemory } from './searchMemory';

describe('searchMemory', () => {
  it('remembers and recalls a copy per path (trailing slash insensitive)', () => {
    const memory = createSearchMemory();
    memory.remember('/employees/', { page: 3, sort: 'lastName.asc' });
    const recalled = memory.recall('/employees');
    expect(recalled).toEqual({ page: 3, sort: 'lastName.asc' });
    if (recalled) recalled.page = 99;
    expect(memory.recall('/employees')).toEqual({ page: 3, sort: 'lastName.asc' });
  });

  it('forgets a path when it is visited with empty search', () => {
    const memory = createSearchMemory();
    memory.remember('/a', { page: 2 });
    memory.remember('/a', {});
    expect(memory.recall('/a')).toBeUndefined();
  });

  it('restores only when entering a path from another path', () => {
    const memory = createSearchMemory();
    memory.remember('/employees', { selected: '4,9' });
    memory.visit('/employees/4');
    expect(memory.recallOnEnter('/employees')).toEqual({ selected: '4,9' });
    memory.visit('/employees');
    // Same path: the user just cleared the state (e.g. bulk delete cleared the selection).
    expect(memory.recallOnEnter('/employees/')).toBeUndefined();
  });

  it('evicts the least recently used entry', () => {
    const memory = createSearchMemory(2);
    memory.remember('/a', { page: 1 });
    memory.remember('/b', { page: 1 });
    memory.remember('/a', { page: 2 });
    memory.remember('/c', { page: 1 });
    expect(memory.recall('/b')).toBeUndefined();
    expect(memory.recall('/a')).toEqual({ page: 2 });
  });
});
