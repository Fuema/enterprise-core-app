import { expect, test } from '@playwright/test';
import { DISPLAY_NAME, loginAs } from './helpers';

test.describe('authentication', () => {
  test('unauthenticated users are redirected to login and returned to the deep link', async ({ page }) => {
    await page.goto('/employees');
    await expect(page).toHaveURL(/\/login\?redirect=/);

    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('admin');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/employees(?:\?|$)/);
    await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible();
  });

  test('client-side validation blocks an empty form', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Username is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('server rejection is shown as a form-level error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('Invalid username or password');
  });

  test('a page reload keeps the session (silent refresh at startup)', async ({ page }) => {
    await loginAs(page, 'manager');
    await page.reload();
    await expect(page.getByText(DISPLAY_NAME.manager, { exact: true })).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('sign out ends the session', async ({ page }) => {
    await loginAs(page, 'viewer');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('permission guard: viewer sees a disabled admin action, admin an enabled one', async ({ page }) => {
    await loginAs(page, 'viewer');
    await expect(page.getByRole('button', { name: 'Admin action' })).toBeDisabled();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/); // wait for logout to complete before the next sign-in

    await loginAs(page, 'admin');
    await expect(page.getByRole('button', { name: 'Admin action' })).toBeEnabled();
  });
});
