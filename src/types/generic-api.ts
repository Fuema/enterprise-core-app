/**
 * Generic, backend-agnostic API contracts.
 * All app-side shapes are camelCase; wire casing is handled in `lib/casing.ts`.
 */

/** Identifier types accepted by the generic service layer. */
export type EntityId = string | number;

/** Any entity the generic CRUD layer can manage. */
export interface Identifiable<TId extends EntityId = string> {
  id: TId;
}

/** Envelope used by backends that wrap every payload. */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

/** Standard server-side pagination shape. */
export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
}

export type SortDirection = 'asc' | 'desc';

/** Field names of T that can be used for sorting (string keys only). */
export type SortableField<T> = Extract<keyof T, string>;

export interface SortConfig<T> {
  field: SortableField<T>;
  direction: SortDirection;
}

/** Scalar values allowed in URL-backed filters. */
export type FilterValue = string | number | boolean;

/**
 * Strongly-typed table query state. Mirrors the URL search params produced by
 * `createTableSearchSchema` so the URL is the single source of truth.
 */
export interface GenericTableFilter<T> {
  page: number;
  pageSize: number;
  search?: string;
  sort?: SortConfig<T>[];
  filters?: Partial<Record<SortableField<T>, FilterValue>>;
}

/** Flat query-string parameters sent to the backend. */
export type QueryParams = Record<string, FilterValue | FilterValue[] | undefined>;

/** Default mutation payloads, overridable per service. */
export type CreatePayload<T extends Identifiable<EntityId>> = Omit<T, 'id'>;
export type UpdatePayload<T extends Identifiable<EntityId>> = Partial<CreatePayload<T>>;

/** RFC 9457 / RFC 7807 problem details (ASP.NET Core default error shape). */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
}
