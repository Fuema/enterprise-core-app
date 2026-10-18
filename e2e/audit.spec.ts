import { expect, test } from '@playwright/test';
import { loginAs, tableRows, waitForRows } from './helpers';
import { openFromNav, openRole } from './helpers-access';

test.describe('audit log', () => {
  test('records sign-ins and changes; filters by action', async ({ page }) => {
    await loginAs(page, 'admin');
    await openRole(page, 'Auditor');
    await page.getByLabel('Description').fill('Reads employees (audited)');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();

    await openFromNav(page, 'Audit log');
    await waitForRows(page);
    await expect(tableRows(page).first()).toContainText('Role updated');
    await expect(tableRows(page).filter({ hasText: 'Signed in' }).first()).toContainText('Ada Admin');

    await page.getByLabel('Filter by action').selectOption({ label: 'Signed in' });
    await expect(page).toHaveURL(/action=auth\.login/);
    await expect
      .poll(async () => (await tableRows(page).allInnerTexts()).every((row) => row.includes('Signed in')))
      .toBe(true);
  });

  test('is read-only and needs audit:read', async ({ page }) => {
    await loginAs(page, 'manager');
    await page.goto('/audit');
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  });
});
