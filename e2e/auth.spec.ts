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

  test('dashboard and navigation follow each feature\'s permissions', async ({ page }) => {
    await loginAs(page, 'viewer');
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Employees' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Countries' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^Employees: \d+ records$/ })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Employees Create / edit: not allowed' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/); // wait for logout to complete before the next sign-in

    await loginAs(page, 'admin');
    for (const feature of ['Employees', 'Countries', 'States', 'Cities']) {
      await expect(nav.getByRole('link', { name: feature })).toBeVisible();
      await expect(page.getByRole('cell', { name: `${feature} Delete: allowed` })).toBeVisible();
    }
    await expect(page.getByRole('link', { name: 'Countries: 3 records' })).toBeVisible();
  });
});
