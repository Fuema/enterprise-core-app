import { setupWorker } from 'msw/browser';
import { authHandlers } from './handlers/auth';
import { employeeHandlers } from './handlers/employees';

/**
 * Mock Service Worker: intercepts the app's real HTTP calls in the browser.
 * Loaded ONLY in `vite dev` with VITE_ENABLE_MOCKS=true (see main.tsx), via a
 * dynamic import, so none of this code ships in production builds.
 *
 * Add handlers for new resources in ./handlers and register them here.
 */
export const worker = setupWorker(...authHandlers, ...employeeHandlers);

export async function startMocking(): Promise<void> {
  await worker.start({
    // MSW 3: anything not mocked (Vite assets, fonts, real third-party calls) passes through.
    onUnhandledFrame: 'bypass',
  });
  console.info(
    '%c[mock api] enabled%c  users: admin/admin · manager/manager · viewer/viewer',
    'color:#fff;background:#7c3aed;padding:1px 6px;border-radius:3px',
    'color:inherit',
  );
}
