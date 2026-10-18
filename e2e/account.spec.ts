import { expect, test } from '@playwright/test';
import { loginAs, signOut } from './helpers';
import { signInWith } from './helpers-access';

test.describe('my account', () => {
  test('change my password, then sign in with the new one', async ({ page }) => {
    await loginAs(page, 'manager');
    await page.getByRole('link', { name: 'Max Manager' }).click();
    await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Active sessions' })).toContainText('This device');

    await page.getByLabel('Current password').fill('not-my-password');
    await page.getByLabel('New password', { exact: true }).fill('Better-Pass1');
    await page.getByLabel('Confirm new password').fill('Better-Pass1');
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByText('Current password is incorrect')).toBeVisible();

    await page.getByLabel('Current password').fill('manager');
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByText('Password changed.')).toBeVisible();

    await signOut(page);
    await signInWith(page, 'manager', 'Better-Pass1');
    await expect(page.getByText('Max Manager', { exact: true })).toBeVisible();
  });

  test('client rules for the new password', async ({ page }) => {
    await loginAs(page, 'viewer');
    await page.getByRole('link', { name: 'Vera Viewer' }).click();
    await page.getByLabel('Current password').fill('viewer');
    await page.getByLabel('New password', { exact: true }).fill('weakpass');
    await page.getByLabel('Confirm new password').fill('different');
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByText('Include an uppercase letter, a lowercase letter and a digit')).toBeVisible();
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('ending this device\'s session signs me out', async ({ page }) => {
    await loginAs(page, 'viewer');
    await page.getByRole('link', { name: 'Vera Viewer' }).click();
    await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
    await page.getByRole('button', { name: /^End session on .*\(this device\)$/ }).click();
    await expect(page).toHaveURL(/\/login/);

    // The session is gone server-side: a protected page sends us back to sign-in.
    await page.goto('/employees');
    await expect(page).toHaveURL(/\/login/);
  });
});
