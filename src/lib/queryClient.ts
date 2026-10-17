import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './apiError';
import { env } from './env';

const MAX_RETRIES = 2;

/** Client errors (4xx) are deterministic: retrying them only wastes requests. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: env.VITE_QUERY_STALE_TIME_MS,
      retry: shouldRetry,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
});

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError;
  }
}
