import type { z } from 'zod';
import { env } from '@/lib/env';

export type StorageArea = 'local' | 'session' | 'memory';

interface StoredValue {
  v: unknown;
  /** Expiry as epoch milliseconds. */
  e?: number;
}

/** Minimal Storage contract so a Map can stand in when Web Storage is unavailable. */
type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

function createMemoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    key: (index) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
}

function resolveStore(area: StorageArea): KeyValueStore {
  if (area === 'memory') return createMemoryStore();
  try {
    const store = area === 'local' ? window.localStorage : window.sessionStorage;
    const probe = '__storage_probe__';
    store.setItem(probe, probe);
    store.removeItem(probe);
    return store;
  } catch {
    // Private mode, disabled cookies, sandboxed iframe: degrade gracefully.
    return createMemoryStore();
  }
}

/**
 * Typed, namespaced browser storage.
 *  - Every read is validated with a Zod schema (corrupt/old data is discarded).
 *  - Optional TTL per entry.
 *  - Falls back to in-memory storage when Web Storage is unavailable.
 *  - Never store tokens or secrets here.
 */
export class StorageService {
  private readonly prefix: string;
  private readonly store: KeyValueStore;

  constructor(namespace: string = env.VITE_STORAGE_NAMESPACE, area: StorageArea = 'local') {
    this.prefix = `${namespace}:`;
    this.store = resolveStore(area);
  }

  get<T>(key: string, schema: z.ZodType<T>): T | undefined {
    const raw = this.safe(() => this.store.getItem(this.prefix + key));
    if (raw === null || raw === undefined) return undefined;
    try {
      const stored = JSON.parse(raw) as StoredValue;
      if (stored.e !== undefined && stored.e < Date.now()) {
        this.remove(key);
        return undefined;
      }
      const parsed = schema.safeParse(stored.v);
      if (parsed.success) return parsed.data;
    } catch {
      // fall through: unreadable entry
    }
    this.remove(key);
    return undefined;
  }

  set<T>(key: string, value: T, options: { ttlMs?: number } = {}): void {
    const stored: StoredValue = { v: value };
    if (options.ttlMs !== undefined) stored.e = Date.now() + options.ttlMs;
    this.safe(() => this.store.setItem(this.prefix + key, JSON.stringify(stored)));
  }

  remove(key: string): void {
    this.safe(() => this.store.removeItem(this.prefix + key));
  }

  /** Removes only this namespace's keys. */
  clear(): void {
    const keys: string[] = [];
    for (let i = 0; i < this.store.length; i += 1) {
      const key = this.store.key(i);
      if (key?.startsWith(this.prefix)) keys.push(key);
    }
    for (const key of keys) this.safe(() => this.store.removeItem(key));
  }

  private safe<R>(operation: () => R): R | undefined {
    try {
      return operation();
    } catch {
      return undefined; // quota exceeded / storage revoked
    }
  }
}

export const localStore = new StorageService(env.VITE_STORAGE_NAMESPACE, 'local');
export const sessionStore = new StorageService(env.VITE_STORAGE_NAMESPACE, 'session');
