import { expect, type Page } from '@playwright/test';
import { tableRows, waitForRows } from './helpers';

/** Clicks a link of the main navigation (client-side: mock data created in the test survives). */
export async function openFromNav(page: Page, label: string): Promise<void> {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: label, exact: true }).click();
}

/** Opens a user's detail page from the Users list. */
export async function openUser(page: Page, username: string): Promise<void> {
  await openFromNav(page, 'Users');
  await waitForRows(page);
  await tableRows(page).getByRole('link', { name: username, exact: true }).click();
  await expect(page.getByRole('heading', { name: username, exact: true })).toBeVisible();
}

/** Opens a role's detail page from the Roles list. */
export async function openRole(page: Page, name: string): Promise<void> {
  await openFromNav(page, 'Roles');
  await waitForRows(page);
  await tableRows(page).getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}

/** Signs in with explicit credentials on the login page that is already open. */
export async function signInWith(page: Page, username: string, password: string): Promise<void> {
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}
