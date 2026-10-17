import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/apiError';

export interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
}

interface GenericErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback. Defaults to <ErrorFallback />. */
  fallback?: (props: ErrorFallbackProps) => ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
  /** When any value changes, a captured error is cleared automatically. */
  resetKeys?: readonly unknown[];
}

interface BoundaryState {
  error: Error | null;
}

class ErrorBoundaryCore extends Component<GenericErrorBoundaryProps & { onReset: () => void }, BoundaryState> {
  override state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  override componentDidUpdate(previous: GenericErrorBoundaryProps): void {
    if (this.state.error && !shallowEqual(previous.resetKeys, this.props.resetKeys)) this.reset();
  }

  reset = (): void => {
    this.props.onReset();
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    const render = this.props.fallback ?? ((props: ErrorFallbackProps) => <ErrorFallback {...props} />);
    return render({ error, reset: this.reset });
  }
}

function shallowEqual(a: readonly unknown[] = [], b: readonly unknown[] = []): boolean {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
}

/**
 * Captures render-time faults and server faults surfaced by TanStack Query
 * (`throwOnError` / suspense). Resetting also resets failed queries.
 */
export function GenericErrorBoundary(props: GenericErrorBoundaryProps) {
  const { reset } = useQueryErrorResetBoundary();
  return <ErrorBoundaryCore {...props} onReset={reset} />;
}

/** Default fallback: understands ApiError (status, title, trace id). */
export function ErrorFallback({ error, reset }: ErrorFallbackProps) {
  const api = error instanceof ApiError ? error : null;
  const title = api?.isForbidden
    ? 'You do not have access to this resource'
    : api?.isNetworkError
      ? 'The server could not be reached'
      : (api?.title ?? 'Something went wrong');

  return (
    <div role="alert" className="mx-auto my-10 grid max-w-lg gap-3 rounded-lg border bg-card p-6 text-card-foreground">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{api?.detail ?? error.message}</p>
      {api && (
        <p className="font-mono text-xs text-muted-foreground">
          Status {api.status}
          {api.traceId ? ` · Trace ${api.traceId}` : ''}
        </p>
      )}
      <div>
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}

/** Router-level error component (loader / beforeLoad / render failures). */
export function RouteErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const queryReset = useQueryErrorResetBoundary();
  return (
    <ErrorFallback
      error={error instanceof Error ? error : new Error(String(error))}
      reset={() => {
        queryReset.reset();
        reset();
        void router.invalidate();
      }}
    />
  );
}
