import { expect, test } from '@playwright/test';
import { breadcrumb, columnTexts, expireAccessTokens, loginAs, mockStats, tableRows, waitForRows } from './helpers';

/** Table columns (1-based): 1 select, 2 name, 3 email, 4 department, 5 job title, 6 hired, 7 status, 8 actions. */
const COL = { name: 2, email: 3, department: 4, jobTitle: 5 } as const;

test.describe('employees: permissions', () => {
  test('viewer: read-only list and detail', async ({ page }) => {
    await loginAs(page, 'viewer');
    await page.getByRole('navigation').getByRole('link', { name: 'Employees' }).first().click();
    await waitForRows(page);

    await expect(page.getByRole('link', { name: 'New employee' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Delete / })).toHaveCount(0);

    await tableRows(page).first().getByRole('link').click();
    await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0);
    await expect(page.getByText('Department', { exact: true })).toBeVisible();
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
    await page.getByLabel('First name').fill('Test');
    await page.getByLabel('Last name').fill('Automation');
    await page.getByLabel('Email').fill(existingEmail);
    await page.getByLabel('Department').selectOption('Payroll');
    await page.getByLabel('Job title').fill('QA Analyst');
    await page.getByRole('button', { name: 'Create employee' }).click();

    // ProblemDetails `errors.email` from the API lands under the Email field.
    await expect(page.getByText('This email is already in use')).toBeVisible();

    const uniqueEmail = `test.automation.${String(Date.now())}@example.test`;
    await page.getByLabel('Email').fill(uniqueEmail);
    await page.getByRole('button', { name: 'Create employee' }).click();

    await expect(page).toHaveURL(/\/employees\/\d+$/);
    await expect(page.getByRole('heading', { name: 'Test Automation' })).toBeVisible();
    await expect(breadcrumb(page)).toContainText('Test Automation');
  });

  test('edit saves changes', async ({ page }) => {
    await loginAs(page, 'manager');
    await page.goto('/employees');
    await waitForRows(page);
    await tableRows(page).first().getByRole('link').click();

    await page.getByLabel('Job title').fill('Principal Engineer');
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
});

test.describe('employees: URL-driven table and search memory', () => {
  test('sort, filter and paging are reflected in the URL', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/employees');
    await waitForRows(page);

    await page.getByRole('button', { name: 'Name', exact: true }).click();
    await expect(page).toHaveURL(/sort=lastName\.asc/);

    await page.getByLabel('Filter by department').selectOption('Payroll');
    await expect(page).toHaveURL(/department=Payroll/);
    // The previous page stays visible while fetching (keepPreviousData): poll until it is replaced.
    await expect.poll(async () => [...new Set(await columnTexts(page, COL.department))]).toEqual(['Payroll']);

    await page.getByLabel('Filter by department').selectOption('');
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/page=2/);
  });

  test('search is debounced into the URL and filters rows', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/employees');
    await waitForRows(page);

    await page.getByLabel('Search').fill('payroll specialist');
    await expect(page).toHaveURL(/search=payroll/);
    await expect
      .poll(async () => {
        const titles = await columnTexts(page, COL.jobTitle);
        return titles.length > 0 && titles.every((title) => title.toLowerCase().includes('payroll specialist'));
      })
      .toBe(true);
  });

  test('leaving and coming back restores page, sort and filter; Reset clears them', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/employees?department=Engineering&sort=lastName.desc');
    await waitForRows(page);

    await tableRows(page).first().getByRole('link').click();
    await expect(page).toHaveURL(/\/employees\/\d+$/);

    await breadcrumb(page).getByRole('link', { name: 'Employees' }).click();
    await expect(page).toHaveURL(/department=Engineering/);
    await expect(page).toHaveURL(/sort=lastName\.desc/);

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page).not.toHaveURL(/department=/);
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
