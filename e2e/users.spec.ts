import { expect, test } from '@playwright/test';
import { loginAs, signInHere, signOut, tableRows, waitForRows } from './helpers';
import { openFromNav, openUser, signInWith } from './helpers-access';

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

test.describe('users: roles and extra permissions', () => {
  test('a role\'s permissions show as inherited (ticked, locked) in the extra-permissions grid', async ({ page }) => {
    await loginAs(page, 'admin');
    await openUser(page, 'viewer');
    await expect(page.getByRole('checkbox', { name: 'Role: Auditor' })).toBeChecked();
    const inherited = page.getByRole('checkbox', { name: 'Employees: View' });
    await expect(inherited).toBeChecked();
    await expect(inherited).toBeDisabled();
  });

  test('assigning a role takes effect at the user\'s next sign-in', async ({ page }) => {
    await loginAs(page, 'admin');
    await openUser(page, 'viewer');
    await page.getByRole('checkbox', { name: 'Role: HR Manager' }).check();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();

    await signOut(page);
    await signInHere(page, 'viewer');
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Cities' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Employees Create / edit: allowed' })).toBeVisible();
  });

  test('an extra permission adds to the roles', async ({ page }) => {
    await loginAs(page, 'admin');
    await openUser(page, 'viewer');
    await page.getByRole('checkbox', { name: 'Countries: View' }).check();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    await expect(page.getByText(/Effective permissions: .*countries:read/)).toBeVisible();

    await signOut(page);
    await signInHere(page, 'viewer');
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
});

test.describe('users: account lifecycle', () => {
  test('an admin creates a user, who must change the temporary password at first sign-in', async ({ page }) => {
    await loginAs(page, 'admin');
    await openFromNav(page, 'Users');
    await page.getByRole('link', { name: 'New user' }).click();
    await expect(page.getByRole('heading', { name: 'New user' })).toBeVisible();
    await page.getByLabel('Username').fill('nina.new');
    await page.getByLabel('Full name').fill('Nina New');
    await page.getByLabel('Email').fill('nina.new@example.test');
    await page.getByRole('checkbox', { name: 'Role: Auditor' }).check();
    await page.getByRole('button', { name: 'Create user' }).click();

    await expect(page.getByRole('heading', { name: 'User created' })).toBeVisible();
    const temporary = (await page.getByLabel('Temporary password', { exact: true }).innerText()).trim();
    expect(temporary).toMatch(/^[A-Za-z0-9]{12,}$/);

    await signOut(page);
    await signInWith(page, 'nina.new', temporary);
    // Forced to the account page; the rest of the app is locked.
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByText('An administrator reset your password')).toBeVisible();

    await page.getByLabel('Current password').fill(temporary);
    await page.getByLabel('New password', { exact: true }).fill('Fresh-Pass1');
    await page.getByLabel('Confirm new password').fill('Fresh-Pass1');
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByText('Password changed.')).toBeVisible();
    await expect(page.getByText('An administrator reset your password')).toHaveCount(0);

    await openFromNav(page, 'Employees');
    await waitForRows(page);
  });

  test('a password reset forces a change at the next sign-in', async ({ page }) => {
    await loginAs(page, 'admin');
    await openUser(page, 'viewer');
    await page.getByRole('button', { name: 'Reset password' }).click();
    await page.getByRole('button', { name: 'Confirm reset' }).click();
    const temporary = (await page.getByLabel('Temporary password', { exact: true }).innerText()).trim();
    await expect(page.getByText('Must change password').first()).toBeVisible();

    await signOut(page);
    await signInWith(page, 'viewer', 'viewer');
    await expect(page.getByRole('alert')).toContainText('Invalid username or password');
    await signInWith(page, 'viewer', temporary);
    await expect(page).toHaveURL(/\/account$/);
  });

  test('a deactivated account can no longer sign in', async ({ page }) => {
    await loginAs(page, 'admin');
    await openUser(page, 'viewer');
    await page.getByLabel('Active (can sign in)').uncheck();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();

    await signOut(page);
    await signInWith(page, 'viewer', 'viewer');
    await expect(page.getByRole('alert')).toContainText('Invalid username or password');
  });

  test('repeated failed sign-ins lock the account until an admin unlocks it', async ({ page }) => {
    await page.goto('/login');
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await signInWith(page, 'viewer', `wrong-${String(attempt)}`);
      await expect(page.getByRole('alert')).toBeVisible();
    }
    await expect(page.getByRole('alert')).toContainText('Too many failed sign-in attempts');

    await signInWith(page, 'admin', 'admin');
    await expect(page.getByText('Ada Admin', { exact: true })).toBeVisible();
    await openUser(page, 'viewer');
    await expect(page.getByText('Locked', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Unlock account' }).click();
    await expect(page.getByRole('button', { name: 'Unlock account' })).toHaveCount(0);
  });
});

test.describe('users: lock-out guards', () => {
  test('an admin cannot deactivate themselves', async ({ page }) => {
    await loginAs(page, 'admin');
    await openUser(page, 'admin');
    await expect(page.getByText('This is your account')).toBeVisible();
    await page.getByLabel('Active (can sign in)').uncheck();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('You cannot deactivate your own account')).toBeVisible();
  });

  test('an admin cannot remove their own users:write', async ({ page }) => {
    await loginAs(page, 'admin');
    await openUser(page, 'admin');
    await page.getByRole('checkbox', { name: 'Role: Administrator' }).uncheck();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('You cannot remove your own users:write permission')).toBeVisible();
  });

  test('the list filters by status and role (URL-driven)', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/users');
    await waitForRows(page);
    await page.getByLabel('Filter by role').selectOption({ label: 'HR Manager' });
    await expect(page).toHaveURL(/roleId=2/);
    await expect.poll(async () => tableRows(page).count()).toBe(1);
    await page.getByLabel('Filter by status').selectOption('inactive');
    await expect(page).toHaveURL(/status=inactive/);
    await expect(page.getByText('No results')).toBeVisible();
  });
});
