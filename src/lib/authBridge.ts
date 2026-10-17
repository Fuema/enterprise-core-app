/**
 * Dependency-inversion seam between the generic runtime engines (`lib/`) and
 * the auth feature. `lib/` never imports `features/`; the auth feature
 * registers these callbacks at bootstrap instead.
 */
export interface AuthBridge {
  /** Current in-memory access token (never persisted to storage). */
  getAccessToken: () => string | undefined;
  /** Called after a successful silent refresh. */
  setAccessToken: (token: string) => void;
  /** Called when the refresh cookie is missing/expired: the session is over. */
  onSessionExpired: () => void;
}

const noopBridge: AuthBridge = {
  getAccessToken: () => undefined,
  setAccessToken: () => undefined,
  onSessionExpired: () => undefined,
};

let current: AuthBridge = noopBridge;

export function registerAuthBridge(bridge: AuthBridge): void {
  current = bridge;
}

export function authBridge(): AuthBridge {
  return current;
}
