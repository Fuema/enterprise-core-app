import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { GenericErrorBoundary } from '@/components/shared/GenericErrorBoundary';
import { queryClient } from '@/lib/queryClient';
import { router } from '@/lib/router';

/** Provider composition root. Feature code never creates its own providers. */
export function App() {
  return (
    <GenericErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </GenericErrorBoundary>
  );
}
