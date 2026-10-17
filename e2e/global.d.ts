// Type of the mock-backend test hook as seen from Playwright's page.evaluate().
// Mirrors MockApiControls in src/mocks/browser.ts (kept separate: e2e must not import app code).
interface Window {
  __mockApi?: {
    expireAccessTokens: () => void;
    stats: () => { loginCount: number; refreshCount: number };
  };
}
