import { expect, test } from '@playwright/test';
import { loginAs, signInHere, signOut } from './helpers';
import { openFromNav, openRole, openUser } from './helpers-access';

test.describe('roles', () => {
  test('manager and viewer have no Roles screen', async ({ page }) => {
    await loginAs(page, 'manager');
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Roles' })).toHaveCount(0);
    await page.goto('/roles');
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  });

  test('create a role, assign it, and its permissions apply to the member', async ({ page }) => {
    await loginAs(page, 'admin');
    await openFromNav(page, 'Roles');
    await page.getByRole('link', { name: 'New role' }).click();
    await expect(page.getByRole('heading', { name: 'New role' })).toBeVisible();
    await page.getByLabel('Role name').fill('Location Editor');
    await page.getByLabel('Description').fill('Maintains countries');
    await page.getByRole('checkbox', { name: 'Countries: all permissions' }).check();
    await page.getByRole('button', { name: 'Create role' }).click();
    await expect(page.getByRole('heading', { name: 'Location Editor' })).toBeVisible();

    await openUser(page, 'viewer');
    await page.getByRole('checkbox', { name: 'Role: Location Editor' }).check();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();

    await openRole(page, 'Location Editor');
    await expect(page.getByRole('list', { name: 'Members' }).getByRole('link', { name: 'viewer' })).toBeVisible();

    await signOut(page);
    await signInHere(page, 'viewer');
    await expect(page.getByRole('cell', { name: 'Countries Delete: allowed' })).toBeVisible();
  });

  test('a role in use cannot be deleted (409 shown inline)', async ({ page }) => {
    await loginAs(page, 'admin');
    await openRole(page, 'Auditor');
    await page.getByRole('button', { name: 'Delete Auditor' }).click();
    await page.getByRole('button', { name: 'Confirm delete Auditor' }).click();
    await expect(page.getByRole('alert')).toContainText('Auditor is assigned to 1 user');
  });

  test('the Administrator system role is locked', async ({ page }) => {
    await loginAs(page, 'admin');
    await openRole(page, 'Administrator');
    await expect(page.getByLabel('Role name')).toHaveAttribute('readonly', '');
    await expect(page.getByRole('checkbox', { name: 'Employees: View' })).toBeDisabled();
    await expect(page.getByRole('button', { name: /^Delete / })).toHaveCount(0);
    await expect(page.getByText('always has every permission')).toBeVisible();
  });

  test('duplicate role names are rejected under the field', async ({ page }) => {
    await loginAs(page, 'admin');
    await openFromNav(page, 'Roles');
    await page.getByRole('link', { name: 'New role' }).click();
    await page.getByLabel('Role name').fill('auditor');
    await page.getByRole('button', { name: 'Create role' }).click();
    await expect(page.getByText('A role with this name already exists')).toBeVisible();
  });
});
