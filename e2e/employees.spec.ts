import { expect, test, type Page } from '@playwright/test';
import { breadcrumb, columnTexts, expireAccessTokens, loginAs, mockStats, tableRows, waitForRows } from './helpers';

/** Table columns (1-based): 1 select, 2 name, 3 email, 4 gender, 5 born, 6 location, 7 pincode, 8 actions. */
const COL = { name: 2, email: 3, gender: 4, location: 6 } as const;

/** Fills every required field of the employee form except the email. */
async function fillEmployeeForm(page: Page): Promise<void> {
  await page.getByLabel('First name').fill('Test');
  await page.getByLabel('Last name').fill('Automation');
  await page.getByLabel('Date of birth').fill('1990-05-15');
  await page.getByLabel('Gender').selectOption('Female');
  // Cascade: each child list loads after its parent is chosen (selectOption waits for the option).
  await page.getByLabel('Country', { exact: true }).selectOption({ label: 'India' });
  await page.getByLabel('State', { exact: true }).selectOption({ label: 'Karnataka' });
  await page.getByLabel('City', { exact: true }).selectOption({ label: 'Bengaluru' });
  await page.getByLabel('Address').fill('12 MG Road');
  await page.getByLabel('Pincode').fill('560001');
}

test.describe('employees: permissions', () => {
  test('viewer: read-only list and detail', async ({ page }) => {
    await loginAs(page, 'viewer');
    await page.getByRole('navigation').getByRole('link', { name: 'Employees' }).first().click();
    await waitForRows(page);

    await expect(page.getByRole('link', { name: 'New employee' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Delete / })).toHaveCount(0);

    await tableRows(page).first().getByRole('link').click();
    await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0);
    await expect(page.getByText('Date of birth', { exact: true })).toBeVisible();
  });

  test('manager: can create, cannot delete', async ({ page }) => {
    await loginAs(page, 'manager');
    await page.goto('/employees');
    await waitForRows(page);

    await expect(page.getByRole('link', { name: 'New employee' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Delete / })).toHaveCount(0);
  });
});

test.describe('employees: create, edit, delete', () => {
  test('create validates on the server (duplicate email mapped to the field) and then succeeds', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/employees');
    await waitForRows(page);
    const existingEmail = (await columnTexts(page, COL.email))[0] ?? '';
    expect(existingEmail).toContain('@');

    await page.getByRole('link', { name: 'New employee' }).click();
    await fillEmployeeForm(page);
    await page.getByLabel('Email').fill(existingEmail);
    await page.getByRole('button', { name: 'Create employee' }).click();

    // ProblemDetails `errors.email` from the API lands under the Email field.
    await expect(page.getByText('This email is already in use')).toBeVisible();

    const uniqueEmail = `test.automation.${String(Date.now())}@example.test`;
    await page.getByLabel('Email').fill(uniqueEmail);
    await page.getByRole('button', { name: 'Create employee' }).click();

    await expect(page).toHaveURL(/\/employees\/\d+$/);
    await expect(page.getByRole('heading', { name: 'Test Automation' })).toBeVisible();
    await expect(breadcrumb(page)).toContainText('Test Automation');
    await expect(page.getByLabel('City', { exact: true })).toHaveValue(/\d+/);
  });

  test('changing the country clears state and city (cascade)', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/employees/new');
    await fillEmployeeForm(page);
    await page.getByLabel('Country', { exact: true }).selectOption({ label: 'Canada' });
    await expect(page.getByLabel('State', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('City', { exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Create employee' }).click();
    await expect(page.getByText('Select a state', { exact: true })).toBeVisible();
  });

  test('edit saves changes', async ({ page }) => {
    await loginAs(page, 'manager');
    await page.goto('/employees');
    await waitForRows(page);
    await tableRows(page).first().getByRole('link').click();

    await page.getByLabel('Address').fill(`Updated ${String(Date.now()).slice(-4)} Park Avenue`);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
  });

  test('admin deletes with inline confirmation', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/employees');
    await waitForRows(page);
    const firstEmail = (await columnTexts(page, COL.email))[0] ?? '';

    await tableRows(page).first().getByRole('button', { name: /^Delete / }).click();
    await tableRows(page).first().getByRole('button', { name: /^Confirm delete/ }).click();

    await expect(page.getByRole('cell', { name: firstEmail, exact: true })).toHaveCount(0);
  });

  test('admin bulk-deletes the selected rows', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/employees');
    await waitForRows(page);
    const emails = (await columnTexts(page, COL.email)).slice(0, 2);

    await tableRows(page).nth(0).getByRole('checkbox', { name: 'Select row' }).check();
    await tableRows(page).nth(1).getByRole('checkbox', { name: 'Select row' }).check();
    await expect(page).toHaveURL(/selected=/);

    await page.getByRole('button', { name: 'Delete selected (2)' }).click();
    await page.getByRole('button', { name: 'Confirm delete 2' }).click();

    await expect(page).not.toHaveURL(/selected=/);
    for (const email of emails) {
      await expect(page.getByRole('cell', { name: email, exact: true })).toHaveCount(0);
    }
  });
});

test.describe('employees: URL-driven table and search memory', () => {
  test('sort, filter and paging are reflected in the URL', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/employees');
    await waitForRows(page);

    await page.getByRole('button', { name: 'Name', exact: true }).click();
    await expect(page).toHaveURL(/sort=lastName\.asc/);

    await page.getByLabel('Filter by country').selectOption({ label: 'India' });
    await expect(page).toHaveURL(/countryId=1/);
    // The previous page stays visible while fetching (keepPreviousData): poll until it is replaced.
    await expect
      .poll(async () => (await columnTexts(page, COL.location)).every((location) => location.endsWith('India')))
      .toBe(true);

    await page.getByLabel('Filter by gender').selectOption('Female');
    await expect(page).toHaveURL(/gender=Female/);
    await expect.poll(async () => [...new Set(await columnTexts(page, COL.gender))]).toEqual(['Female']);

    await page.getByLabel('Filter by gender').selectOption('');
    await page.getByLabel('Filter by country').selectOption('');
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/page=2/);
  });

  test('search is debounced into the URL and filters rows', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/employees');
    await waitForRows(page);

    await page.getByLabel('Search').fill('pune');
    await expect(page).toHaveURL(/search=pune/);
    await expect
      .poll(async () => {
        const locations = await columnTexts(page, COL.location);
        return locations.length > 0 && locations.every((location) => location.startsWith('Pune'));
      })
      .toBe(true);
  });

  test('leaving and coming back restores page, sort and filter; Reset clears them', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/employees?countryId=2&sort=lastName.desc');
    await waitForRows(page);

    await tableRows(page).first().getByRole('link').click();
    await expect(page).toHaveURL(/\/employees\/\d+$/);

    await breadcrumb(page).getByRole('link', { name: 'Employees' }).click();
    await expect(page).toHaveURL(/countryId=2/);
    await expect(page).toHaveURL(/sort=lastName\.desc/);

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page).not.toHaveURL(/countryId=/);
  });

  test('tampered URL values are ignored safely', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/employees?page=-3&pageSize=99999&sort=password.asc');
    await waitForRows(page);
    await expect(page.getByText('Page 1 of')).toBeVisible();
  });
});

test.describe('employees: resilience', () => {
  test('expired access token is refreshed silently and the request is retried', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/employees');
    await waitForRows(page);
    const before = await mockStats(page);
    const firstEmailOnPage1 = (await columnTexts(page, COL.email))[0];

    await expireAccessTokens(page);
    await page.getByRole('button', { name: 'Next page' }).click();

    await expect(page).toHaveURL(/page=2/);
    // Page 2 data actually arrived (the 401 was refreshed and the request replayed)...
    await expect.poll(async () => (await columnTexts(page, COL.email))[0]).not.toBe(firstEmailOnPage1);
    await expect(page.getByText(/^Page 2 of/)).toBeVisible();
    // ...through exactly the silent-refresh path, without leaving the page.
    await expect.poll(async () => (await mockStats(page)).refreshCount).toBeGreaterThan(before.refreshCount);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('unknown or malformed employee ids show "not found"', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/employees/999999');
    await expect(page.getByText('Employee not found')).toBeVisible();

    await page.goto('/employees/abc');
    await expect(page.getByText('Employee not found')).toBeVisible();
  });
});
