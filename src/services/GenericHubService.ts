import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
  type IRetryPolicy,
  type RetryContext,
} from '@microsoft/signalr';
import type { QueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import { casing, currentTenant } from '@/lib/apiClient';
import { authBridge } from '@/lib/authBridge';
import { env } from '@/lib/env';
import type { QueryKeys } from '@/lib/queryKeys';
import type { EntityId, Identifiable, PaginatedResponse } from '@/types/generic-api';

/** How a broadcast event is applied to the TanStack Query cache. */
export type HubCacheAction =
  /** Payload is the full entity: write detail cache, patch it in loaded pages. */
  | 'upsert'
  /** Payload is the entity or its id: drop it from detail and page caches. */
  | 'remove'
  /** Payload ignored: mark every query of the resource stale. */
  | 'invalidate';

export interface EntityStreamBinding {
  /** Server-side method name, e.g. "EmployeeUpdated". */
  event: string;
  action: HubCacheAction;
}

export type HubStatus = 'disabled' | 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface GenericHubConfig<TEntity extends Identifiable<TId>, TId extends EntityId> {
  /** Hub route relative to VITE_HUB_BASE_URL, e.g. "/hubs/employees". */
  hubPath: string;
  /** Query keys of the resource this hub streams (use `service.keys`). */
  keys: QueryKeys<TEntity, TId>;
  /** Event -> cache action map. No feature-specific handler code is needed. */
  bindings: readonly EntityStreamBinding[];
  queryClient: QueryClient;
  /** Optional runtime validation of every streamed entity. */
  schema?: z.ZodType<TEntity>;
}

function createRetryPolicy(maxDelayMs: number, maxRetries: number): IRetryPolicy {
  return {
    nextRetryDelayInMilliseconds: ({ previousRetryCount }: RetryContext) => {
      if (previousRetryCount >= maxRetries) return null;
      const exponential = Math.min(maxDelayMs, 1000 * 2 ** previousRetryCount);
      return Math.round(exponential * (0.8 + Math.random() * 0.4)); // +-20% jitter
    },
  };
}

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * Abstract real-time engine (SignalR; WebSockets with automatic transport fallback).
 *
 *  - connect / disconnect / throttled reconnection (exponential back-off + jitter)
 *  - pipes broadcast events straight into the TanStack Query cache via
 *    declarative `bindings` — subclasses contain configuration only
 *  - after a reconnect, the whole resource is invalidated (events may have been missed)
 *  - disabled automatically when VITE_HUB_BASE_URL is empty
 *
 * @example
 * export class EmployeeHub extends GenericHubService<Employee, number> {
 *   constructor(queryClient: QueryClient) {
 *     super({
 *       hubPath: '/hubs/employees',
 *       keys: employeeService.keys,
 *       queryClient,
 *       bindings: [
 *         { event: 'EmployeeCreated', action: 'invalidate' },
 *         { event: 'EmployeeUpdated', action: 'upsert' },
 *         { event: 'EmployeeDeleted', action: 'remove' },
 *       ],
 *     });
 *   }
 * }
 */
export abstract class GenericHubService<TEntity extends Identifiable<TId>, TId extends EntityId = string> {
  protected readonly connection: HubConnection | null;
  protected readonly config: GenericHubConfig<TEntity, TId>;
  private currentStatus: HubStatus;
  private readonly statusListeners = new Set<(status: HubStatus) => void>();
  private startPromise: Promise<void> | null = null;
  private stopRequested = false;

  protected constructor(config: GenericHubConfig<TEntity, TId>) {
    this.config = config;

    if (!env.VITE_HUB_BASE_URL) {
      this.connection = null;
      this.currentStatus = 'disabled';
      return;
    }

    const url = new URL(env.VITE_HUB_BASE_URL.replace(/\/+$/, '') + config.hubPath);
    // Browsers cannot set headers on WebSocket upgrades: tenant travels in the query string too.
    if (currentTenant) url.searchParams.set('tenant', currentTenant);

    this.connection = new HubConnectionBuilder()
      .withUrl(url.toString(), {
        accessTokenFactory: () => authBridge().getAccessToken() ?? '',
        headers: currentTenant ? { [env.VITE_TENANT_HEADER_NAME]: currentTenant } : {},
        withCredentials: true,
      })
      .withAutomaticReconnect(createRetryPolicy(env.VITE_HUB_MAX_RETRY_DELAY_MS, env.VITE_HUB_MAX_RETRIES))
      .configureLogging(import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning)
      .build();

    this.currentStatus = 'disconnected';
    this.connection.onreconnecting(() => this.setStatus('reconnecting'));
    this.connection.onreconnected(() => {
      this.setStatus('connected');
      void this.config.queryClient.invalidateQueries({ queryKey: this.config.keys.all });
    });
    this.connection.onclose(() => this.setStatus('disconnected'));

    for (const binding of config.bindings) {
      this.connection.on(binding.event, (payload: unknown) => this.applyToCache(binding.action, payload));
    }
  }

  get status(): HubStatus {
    return this.currentStatus;
  }

  /** Subscribe to status changes (works with useSyncExternalStore). */
  subscribe = (listener: (status: HubStatus) => void): (() => void) => {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  };

  getStatus = (): HubStatus => this.currentStatus;

  /** Idempotent. Retries the initial connection with the same back-off policy. */
  start(): Promise<void> {
    const connection = this.connection;
    if (!connection || connection.state !== HubConnectionState.Disconnected) return Promise.resolve();
    this.stopRequested = false;
    this.startPromise ??= this.startWithRetry(connection).finally(() => {
      this.startPromise = null;
    });
    return this.startPromise;
  }

  async stop(): Promise<void> {
    this.stopRequested = true;
    if (this.connection && this.connection.state !== HubConnectionState.Disconnected) {
      await this.connection.stop();
    }
    if (this.connection) this.setStatus('disconnected');
  }

  /** Register an extra, non-cache event handler. Returns an unsubscribe function. */
  protected on<TArgs extends unknown[]>(event: string, handler: (...args: TArgs) => void): () => void {
    if (!this.connection) return () => undefined;
    const wrapped = (...args: unknown[]) => handler(...(args.map((arg) => casing.fromApi(arg)) as TArgs));
    this.connection.on(event, wrapped);
    return () => this.connection?.off(event, wrapped);
  }

  /** Invoke a hub method on the server. */
  protected async invoke<TResult>(method: string, ...args: unknown[]): Promise<TResult> {
    if (!this.connection) throw new Error('Real-time hub is disabled (VITE_HUB_BASE_URL is empty).');
    const result: unknown = await this.connection.invoke(method, ...args.map((arg) => casing.toApi(arg)));
    return casing.fromApi(result) as TResult;
  }

  /** Override for custom DTO -> model mapping of streamed entities. */
  protected parseEntity(raw: unknown): TEntity {
    const mapped = casing.fromApi(raw);
    return this.config.schema ? this.config.schema.parse(mapped) : (mapped as TEntity);
  }

  // -------------------------------------------------------------------------

  private async startWithRetry(connection: HubConnection): Promise<void> {
    const policy = createRetryPolicy(env.VITE_HUB_MAX_RETRY_DELAY_MS, env.VITE_HUB_MAX_RETRIES);
    for (let attempt = 0; !this.stopRequested; attempt += 1) {
      this.setStatus(attempt === 0 ? 'connecting' : 'reconnecting');
      try {
        await connection.start();
        this.setStatus('connected');
        return;
      } catch (error) {
        const wait = policy.nextRetryDelayInMilliseconds({
          previousRetryCount: attempt,
          elapsedMilliseconds: 0,
          retryReason: error instanceof Error ? error : new Error(String(error)),
        });
        if (wait === null) {
          this.setStatus('disconnected');
          throw error;
        }
        await delay(wait);
      }
    }
  }

  private applyToCache(action: HubCacheAction, payload: unknown): void {
    const { queryClient, keys } = this.config;
    switch (action) {
      case 'invalidate': {
        void queryClient.invalidateQueries({ queryKey: keys.all });
        return;
      }
      case 'upsert': {
        const entity = this.parseEntity(payload);
        queryClient.setQueryData(keys.detail(entity.id), entity);
        let found = false;
        queryClient.setQueriesData<PaginatedResponse<TEntity>>({ queryKey: keys.lists() }, (page) => {
          if (!page) return page;
          const index = page.data.findIndex((item) => item.id === entity.id);
          if (index === -1) return page;
          found = true;
          const data = [...page.data];
          data[index] = entity;
          return { ...page, data };
        });
        // New entity or not on a loaded page: position/count unknown -> refetch lists.
        if (!found) void queryClient.invalidateQueries({ queryKey: keys.lists() });
        return;
      }
      case 'remove': {
        const id = this.extractId(payload);
        if (id === undefined) {
          void queryClient.invalidateQueries({ queryKey: keys.all });
          return;
        }
        queryClient.removeQueries({ queryKey: keys.detail(id) });
        queryClient.setQueriesData<PaginatedResponse<TEntity>>({ queryKey: keys.lists() }, (page) =>
          page
            ? { ...page, data: page.data.filter((item) => item.id !== id), totalCount: Math.max(0, page.totalCount - 1) }
            : page,
        );
        void queryClient.invalidateQueries({ queryKey: keys.lists(), refetchType: 'none' });
        return;
      }
    }
  }

  private extractId(payload: unknown): TId | undefined {
    const mapped = casing.fromApi(payload);
    const candidate: unknown = mapped !== null && typeof mapped === 'object' && 'id' in mapped ? mapped.id : mapped;
    return typeof candidate === 'string' || typeof candidate === 'number' ? (candidate as TId) : undefined;
  }

  private setStatus(status: HubStatus): void {
    if (this.currentStatus === status) return;
    this.currentStatus = status;
    for (const listener of this.statusListeners) listener(status);
  }
}
