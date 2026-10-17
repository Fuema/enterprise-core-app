import { expect, type Locator, type Page } from '@playwright/test';

/** Demo accounts of the mock backend (src/mocks/db.ts). */
export type MockUser = 'admin' | 'manager' | 'viewer';

export const DISPLAY_NAME: Record<MockUser, string> = {
  admin: 'Ada Admin',
  manager: 'Max Manager',
  viewer: 'Vera Viewer',
};

/** Signs in through the real login form and waits for the home page. */
export async function loginAs(page: Page, user: MockUser): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Username').fill(user);
  await page.getByLabel('Password').fill(user);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText(DISPLAY_NAME[user], { exact: true })).toBeVisible();
}

/** Data rows of the generic data table (header excluded). */
export function tableRows(page: Page): Locator {
  return page.locator('table tbody tr');
}

/** Text of one column (1-based, includes the selection checkbox column). */
export async function columnTexts(page: Page, column: number): Promise<string[]> {
  return page.locator(`table tbody tr td:nth-child(${String(column)})`).allInnerTexts();
}

/** Waits until the table shows real rows (not skeletons, not the empty message). */
export async function waitForRows(page: Page): Promise<void> {
  await expect(tableRows(page).first().getByRole('link')).toBeVisible();
}

/** Mock backend controls exposed on window (src/mocks/browser.ts). */
export async function expireAccessTokens(page: Page): Promise<void> {
  const mocked = await page.evaluate(() => {
    if (!window.__mockApi) return false;
    window.__mockApi.expireAccessTokens();
    return true;
  });
  expect(mocked, 'mock backend must be running (VITE_ENABLE_MOCKS=true)').toBe(true);
}

export async function mockStats(page: Page): Promise<{ loginCount: number; refreshCount: number }> {
  return page.evaluate(() => window.__mockApi?.stats() ?? { loginCount: 0, refreshCount: 0 });
}

/** The breadcrumb trail, scoped so it never matches header navigation links. */
export function breadcrumb(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Breadcrumb' });
}
