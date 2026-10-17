import type { AxiosInstance } from 'axios';
import type { z } from 'zod';
import { apiClient, unwrapEnvelope } from '@/lib/apiClient';
import { createQueryKeys, type QueryKeys } from '@/lib/queryKeys';
import type {
  CreatePayload,
  EntityId,
  GenericTableFilter,
  Identifiable,
  PaginatedResponse,
  QueryParams,
  UpdatePayload,
} from '@/types/generic-api';

export interface BaseApiServiceOptions<TEntity> {
  /**
   * Runtime contract for one entity. When provided, EVERY entity coming from
   * the server is parsed with it (defensive mapping for untrusted contracts).
   */
  schema?: z.ZodType<TEntity>;
  /** HTTP verb used by `update`. Default "put". */
  updateMethod?: 'put' | 'patch';
  /** Alternate Axios instance (tests, a second backend). Default: apiClient. */
  http?: AxiosInstance;
}

/**
 * Abstract, fully generic CRUD service.
 *
 *   TEntity  entity returned by the API (camelCase, already mapped)
 *   TId      identifier type (string | number)
 *   TCreate  payload for POST   (default: entity without `id`)
 *   TUpdate  payload for PUT/PATCH (default: partial create payload)
 *
 * Casing, auth, tenancy, envelopes and error normalisation are handled by the
 * shared Axios client, so subclasses contain only domain specifics.
 *
 * @example
 * class EmployeeService extends BaseApiService<Employee, number> {
 *   constructor() { super('/employees', { schema: employeeSchema }); }
 * }
 * export const employeeService = new EmployeeService();
 */
export abstract class BaseApiService<
  TEntity extends Identifiable<TId>,
  TId extends EntityId = string,
  TCreate = CreatePayload<TEntity>,
  TUpdate = UpdatePayload<TEntity>,
> {
  /** Hierarchical TanStack Query keys for this resource. */
  readonly keys: QueryKeys<TEntity, TId>;
  protected readonly resourcePath: string;
  protected readonly http: AxiosInstance;
  protected readonly schema: z.ZodType<TEntity> | undefined;
  protected readonly updateMethod: 'put' | 'patch';

  protected constructor(resourcePath: string, options: BaseApiServiceOptions<TEntity> = {}) {
    this.resourcePath = resourcePath.replace(/\/+$/, '');
    this.http = options.http ?? apiClient;
    this.schema = options.schema;
    this.updateMethod = options.updateMethod ?? 'put';
    this.keys = createQueryKeys<TEntity, TId>(this.resourcePath);
  }

  async getAll(filter: GenericTableFilter<TEntity>, signal?: AbortSignal): Promise<PaginatedResponse<TEntity>> {
    const response = await this.http.get<unknown>(this.resourcePath, { params: this.toQueryParams(filter), signal });
    return this.toPaginated(unwrapEnvelope<unknown>(response.data), filter);
  }

  async getById(id: TId, signal?: AbortSignal): Promise<TEntity> {
    const response = await this.http.get<unknown>(this.entityUrl(id), { signal });
    return this.parseEntity(unwrapEnvelope<unknown>(response.data));
  }

  async create(payload: TCreate): Promise<TEntity> {
    const response = await this.http.post<unknown>(this.resourcePath, payload);
    return this.parseEntity(unwrapEnvelope<unknown>(response.data));
  }

  async update(id: TId, payload: TUpdate): Promise<TEntity> {
    const response = await this.http.request<unknown>({
      method: this.updateMethod,
      url: this.entityUrl(id),
      data: payload,
    });
    return this.parseEntity(unwrapEnvelope<unknown>(response.data));
  }

  async delete(id: TId): Promise<void> {
    await this.http.delete(this.entityUrl(id));
  }

  // -------------------------------------------------------------------------
  // Extension points
  // -------------------------------------------------------------------------

  protected entityUrl(id: TId): string {
    return `${this.resourcePath}/${encodeURIComponent(String(id))}`;
  }

  /**
   * Table filter -> query string. Override to match a specific backend, e.g.
   * OData ($top/$skip/$orderby) or "sortBy=&sortDir=".
   * Default: ?page=1&pageSize=20&search=x&sort=lastName.asc,hireDate.desc&<filters>
   */
  protected toQueryParams(filter: GenericTableFilter<TEntity>): QueryParams {
    const params: QueryParams = { page: filter.page, pageSize: filter.pageSize };
    if (filter.search) params.search = filter.search;
    if (filter.sort && filter.sort.length > 0) {
      params.sort = filter.sort.map(({ field, direction }) => `${field}.${direction}`).join(',');
    }
    if (filter.filters) {
      for (const [key, value] of Object.entries(filter.filters)) {
        if (value !== undefined) params[key] = value as QueryParams[string];
      }
    }
    return params;
  }

  /** Accepts PaginatedResponse<T> or a bare array (non-paginated endpoints). */
  protected toPaginated(body: unknown, filter: GenericTableFilter<TEntity>): PaginatedResponse<TEntity> {
    if (Array.isArray(body)) {
      return { data: body.map((item) => this.parseEntity(item)), totalCount: body.length, pageSize: body.length, currentPage: 1 };
    }
    const page = body as Partial<PaginatedResponse<unknown>>;
    const data = Array.isArray(page.data) ? page.data.map((item) => this.parseEntity(item)) : [];
    return {
      data,
      totalCount: typeof page.totalCount === 'number' ? page.totalCount : data.length,
      pageSize: typeof page.pageSize === 'number' ? page.pageSize : filter.pageSize,
      currentPage: typeof page.currentPage === 'number' ? page.currentPage : filter.page,
    };
  }

  /** Contract mapping for a single entity. Override for custom DTO -> model mapping. */
  protected parseEntity(raw: unknown): TEntity {
    return this.schema ? this.schema.parse(raw) : (raw as TEntity);
  }
}
