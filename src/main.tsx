import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initializeAuth, restoreSession } from './features/auth';
import { env } from './lib/env';
import { router } from './lib/router';

/**
 * Starts the in-browser mock backend when enabled. `import.meta.env.DEV` is a
 * compile-time constant, so the dynamic import (and MSW itself) is removed
 * from production bundles entirely.
 */
async function enableMocking(): Promise<void> {
  if (!import.meta.env.DEV || !env.VITE_ENABLE_MOCKS) return;
  const { startMocking } = await import('./mocks/browser');
  await startMocking();
}

async function bootstrap(): Promise<void> {
  // 0. Mock backend must be listening before the first request (session restore).
  await enableMocking();

  // 1. Wire the generic HTTP/hub engines to the auth feature.
  //    When the refresh cookie is gone, re-run route guards -> /login.
  initializeAuth({ onSessionExpired: () => void router.invalidate() });

  // 2. Silent refresh: a page reload keeps the user signed in (httpOnly cookie).
  await restoreSession();

  // 3. Mount.
  const container = document.getElementById('root');
  if (!container) throw new Error('Root element #root not found in index.html');
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
