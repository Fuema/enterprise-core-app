import { expect, test, type Page } from '@playwright/test';

async function fillSignup(page: Page, values: { username: string; email: string; password?: string; confirm?: string }) {
  await page.getByLabel('Full name').fill('Sam Signup');
  await page.getByLabel('Username').fill(values.username);
  await page.getByLabel('Email').fill(values.email);
  await page.getByLabel('Password', { exact: true }).fill(values.password ?? 'Passw0rd!');
  await page.getByLabel('Confirm password').fill(values.confirm ?? values.password ?? 'Passw0rd!');
}

test.describe('signup', () => {
  test('a new account is signed in with least-privilege access', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Create an account' }).click();
    await expect(page).toHaveURL(/\/signup$/);

    const username = `sam.${String(Date.now())}`;
    await fillSignup(page, { username, email: `${username}@example.test` });
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('heading', { name: 'Welcome, Sam Signup' })).toBeVisible();
    // Default scope: employees:read only.
    await expect(page.getByRole('cell', { name: 'Employees View: allowed' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Employees Create / edit: not allowed' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Cities' })).toHaveCount(0);
    // (No page.goto here: a full reload reseeds the mock DB, which forgets accounts created by signup.)
  });

  test('client rules: password strength and confirmation', async ({ page }) => {
    await page.goto('/signup');
    await fillSignup(page, { username: 'weak.user', email: 'weak@example.test', password: 'password', confirm: 'different' });
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Include an uppercase letter, a lowercase letter and a digit')).toBeVisible();
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('server rules: a taken username is reported under the field', async ({ page }) => {
    await page.goto('/signup');
    await fillSignup(page, { username: 'admin', email: `new.${String(Date.now())}@example.test` });
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('This username is already taken')).toBeVisible();
    await expect(page).toHaveURL(/\/signup$/);
  });
});
