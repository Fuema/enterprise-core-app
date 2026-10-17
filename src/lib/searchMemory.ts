/**
 * In-memory, per-path history of the last search params a user applied
 * (page, page size, sort, filters). The router records every resolved
 * location and, when a path is re-entered WITHOUT search params (breadcrumb,
 * nav link, "back to list" button), restores the remembered deep link.
 *
 * Deliberately NOT persisted: it lives for the browser session only.
 * Opt a route out with `staticData: { persistSearch: false }`.
 */

export type SearchRecord = Record<string, unknown>;

export interface SearchMemory {
  remember: (pathname: string, search: SearchRecord) => void;
  recall: (pathname: string) => SearchRecord | undefined;
  forget: (pathname: string) => void;
  clear: () => void;
}

export function createSearchMemory(limit = 50): SearchMemory {
  const entries = new Map<string, SearchRecord>();
  const normalize = (pathname: string) => (pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname);

  return {
    remember(pathname, search) {
      const key = normalize(pathname);
      entries.delete(key);
      if (Object.keys(search).length === 0) return;
      entries.set(key, { ...search });
      // Least-recently-used eviction.
      while (entries.size > limit) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
    },
    recall(pathname) {
      const value = entries.get(normalize(pathname));
      return value ? { ...value } : undefined;
    },
    forget(pathname) {
      entries.delete(normalize(pathname));
    },
    clear() {
      entries.clear();
    },
  };
}

/** Application-wide instance used by the router pipeline. */
export const searchMemory = createSearchMemory();
