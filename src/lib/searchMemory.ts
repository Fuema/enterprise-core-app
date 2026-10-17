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
  /** Records the path the user is currently on (called for every resolved navigation). */
  visit: (pathname: string) => void;
  /**
   * Remembered search for a path the user is ENTERING from another path.
   * Navigations within the same path (clearing the last filter or the row
   * selection) return undefined: the user removed that state on purpose.
   */
  recallOnEnter: (pathname: string) => SearchRecord | undefined;
  forget: (pathname: string) => void;
  clear: () => void;
}

export function createSearchMemory(limit = 50): SearchMemory {
  const entries = new Map<string, SearchRecord>();
  const normalize = (pathname: string) => (pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname);
  let currentPath: string | undefined;

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
    visit(pathname) {
      currentPath = normalize(pathname);
    },
    recallOnEnter(pathname) {
      const key = normalize(pathname);
      if (key === currentPath) return undefined;
      const value = entries.get(key);
      return value ? { ...value } : undefined;
    },
    forget(pathname) {
      entries.delete(normalize(pathname));
    },
    clear() {
      entries.clear();
      currentPath = undefined;
    },
  };
}

/** Application-wide instance used by the router pipeline. */
export const searchMemory = createSearchMemory();
