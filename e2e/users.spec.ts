import { expect, test, type Page } from '@playwright/test';
import { loginAs, signInHere, signOut, tableRows, waitForRows } from './helpers';

/** Opens a user's detail page from the list (client-side, so mock changes survive). */
async function openUser(page: Page, username: string): Promise<void> {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Users' }).click();
  await waitForRows(page);
  await tableRows(page).getByRole('link', { name: username, exact: true }).click();
  await expect(page.getByRole('heading', { name: username, exact: true })).toBeVisible();
}

test.describe('users: access to the admin screen', () => {
  for (const user of ['viewer', 'manager'] as const) {
    test(`${user} cannot open it`, async ({ page }) => {
      await loginAs(page, user);
      await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Users' })).toHaveCount(0);
      await page.goto('/users');
      await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
    });
  }
});

test.describe('users: admin manages access', () => {
  test('granting a permission takes effect at the user\'s next sign-in', async ({ page }) => {
    await loginAs(page, 'admin');
    await openUser(page, 'viewer');

    await page.getByRole('checkbox', { name: 'Countries: View' }).check();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();

    await signOut(page);
    await signInHere(page, 'viewer');
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Countries' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Countries View: allowed' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Countries Create / edit: not allowed' })).toBeVisible();
  });

  test('"All" grants a whole feature; unticking one action keeps the others', async ({ page }) => {
    await loginAs(page, 'admin');
    await openUser(page, 'viewer');

    await page.getByRole('checkbox', { name: 'Cities: all permissions' }).check();
    for (const action of ['View', 'Create / edit', 'Delete']) {
      await expect(page.getByRole('checkbox', { name: `Cities: ${action}` })).toBeChecked();
    }
    await page.getByRole('checkbox', { name: 'Cities: Delete' }).uncheck();
    await expect(page.getByRole('checkbox', { name: 'Cities: all permissions' })).not.toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Cities: View' })).toBeChecked();
  });

  test('a deactivated account can no longer sign in', async ({ page }) => {
    await loginAs(page, 'admin');
    await openUser(page, 'viewer');

    await page.getByLabel('Active (can sign in)').uncheck();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();

    await signOut(page);
    await page.getByLabel('Username').fill('viewer');
    await page.getByLabel('Password').fill('viewer');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('Invalid username or password');
  });

  test('an admin cannot lock themselves out', async ({ page }) => {
    await loginAs(page, 'admin');
    await openUser(page, 'admin');
    await expect(page.getByText('This is your account')).toBeVisible();

    await page.getByLabel('Active (can sign in)').uncheck();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('You cannot deactivate your own account')).toBeVisible();
  });

  test('the list filters by status (URL-driven)', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/users');
    await waitForRows(page);
    await page.getByLabel('Filter by status').selectOption('inactive');
    await expect(page).toHaveURL(/status=inactive/);
    await expect(page.getByText('No results')).toBeVisible();
  });
});
