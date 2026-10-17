import { isAxiosError } from 'axios';
import type { ProblemDetails } from '@/types/generic-api';
import type { FieldErrorMap } from '@/types/generic-form';
import { normalizeFieldPath } from './casing';

/**
 * The ONLY error type that leaves the network layer. Normalises Axios errors,
 * RFC 7807 ProblemDetails (ASP.NET Core), envelope errors and network faults.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly title: string;
  readonly detail: string | undefined;
  readonly traceId: string | undefined;
  /** camelCase field path -> messages, ready for React Hook Form. */
  readonly fieldErrors: FieldErrorMap;
  readonly isNetworkError: boolean;

  constructor(init: {
    status: number;
    title: string;
    detail?: string;
    traceId?: string;
    fieldErrors?: FieldErrorMap;
    isNetworkError?: boolean;
    cause?: unknown;
  }) {
    super(init.detail ?? init.title, { cause: init.cause });
    this.name = 'ApiError';
    this.status = init.status;
    this.title = init.title;
    this.detail = init.detail;
    this.traceId = init.traceId;
    this.fieldErrors = init.fieldErrors ?? {};
    this.isNetworkError = init.isNetworkError ?? false;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isValidation(): boolean {
    return this.status === 400 || this.status === 422;
  }

  get hasFieldErrors(): boolean {
    return Object.keys(this.fieldErrors).length > 0;
  }

  /** Converts anything thrown by Axios (or code above it) into an ApiError. */
  static from(error: unknown, keyFromApi: (key: string) => string): ApiError {
    if (error instanceof ApiError) return error;

    if (isAxiosError(error)) {
      if (!error.response) {
        const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
        return new ApiError({
          status: 0,
          title: timedOut ? 'Request timed out' : 'Network error',
          // User-facing text; the raw Axios message stays available via `cause`.
          detail: timedOut
            ? 'The server took too long to respond. Please try again.'
            : 'The server could not be reached. Check your connection and try again.',
          isNetworkError: true,
          cause: error,
        });
      }
      const body = asProblemDetails(error.response.data);
      return new ApiError({
        status: error.response.status,
        title: body.title ?? error.response.statusText ?? 'Request failed',
        detail: body.detail,
        traceId: body.traceId,
        fieldErrors: normalizeFieldErrors(body.errors, keyFromApi),
        cause: error,
      });
    }

    return new ApiError({
      status: -1,
      title: 'Unexpected error',
      detail: error instanceof Error ? error.message : String(error),
      cause: error,
    });
  }
}

function asProblemDetails(data: unknown): ProblemDetails {
  if (data === null || typeof data !== 'object') return {};
  const record = data as Record<string, unknown>;
  // Accept both camelCase and PascalCase keys; the casing interceptor may not have run on errors.
  const pick = (name: string): unknown => record[name] ?? record[name.charAt(0).toUpperCase() + name.slice(1)];
  const str = (value: unknown) => (typeof value === 'string' ? value : undefined);
  const errors = pick('errors');
  return {
    title: str(pick('title')) ?? str(pick('message')),
    detail: str(pick('detail')),
    traceId: str(pick('traceId')),
    errors: isErrorRecord(errors) ? errors : undefined,
  };
}

function isErrorRecord(value: unknown): value is Record<string, string[]> {
  return (
    value !== null &&
    typeof value === 'object' &&
    Object.values(value).every((messages) => Array.isArray(messages) && messages.every((m) => typeof m === 'string'))
  );
}

function normalizeFieldErrors(
  errors: Record<string, string[]> | undefined,
  keyFromApi: (key: string) => string,
): FieldErrorMap {
  if (!errors) return {};
  const result: FieldErrorMap = {};
  for (const [path, messages] of Object.entries(errors)) {
    const key = normalizeFieldPath(path, keyFromApi);
    result[key] = [...(result[key] ?? []), ...messages];
  }
  return result;
}
