import { expect, test } from '@playwright/test';
import { breadcrumb, loginAs, tableRows, waitForRows } from './helpers';

test.describe('locations: per-feature permissions', () => {
  test('viewer cannot reach any location feature', async ({ page }) => {
    await loginAs(page, 'viewer');
    for (const path of ['/countries', '/states', '/cities']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
    }
  });

  test('manager: countries read-only, cities editable but not deletable', async ({ page }) => {
    await loginAs(page, 'manager');
    await page.goto('/countries');
    await waitForRows(page);
    await expect(page.getByRole('link', { name: 'New country' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Delete / })).toHaveCount(0);
    await tableRows(page).first().getByRole('link').click();
    await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0);

    await page.goto('/countries/new');
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();

    await page.goto('/cities');
    await waitForRows(page);
    await expect(page.getByRole('link', { name: 'New city' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Delete / })).toHaveCount(0);
  });
});

test.describe('locations: admin CRUD', () => {
  test('create a country, a state in it and a city in that state; they appear in the employee form', async ({ page }) => {
    await loginAs(page, 'admin');
    const suffix = String(Date.now()).slice(-6);
    const country = `Testland ${suffix}`;

    await page.goto('/countries/new');
    await page.getByLabel('Country name').fill(country);
    await page.getByRole('button', { name: 'Create country' }).click();
    await expect(page.getByRole('heading', { name: country })).toBeVisible();
    await expect(breadcrumb(page)).toContainText(country);

    // Client-side navigation only from here: a full reload would reseed the mock DB.
    const nav = page.getByRole('navigation', { name: 'Main' });
    await nav.getByRole('link', { name: 'States' }).click();
    await page.getByRole('link', { name: 'New state' }).click();
    await expect(page.getByRole('heading', { name: 'New state' })).toBeVisible();
    await page.getByLabel('State name').fill('North Province');
    await page.getByLabel('Country', { exact: true }).selectOption({ label: country });
    await page.getByRole('button', { name: 'Create state' }).click();
    await expect(page.getByRole('heading', { name: 'North Province' })).toBeVisible();

    await nav.getByRole('link', { name: 'Cities' }).click();
    await page.getByRole('link', { name: 'New city' }).click();
    await expect(page.getByRole('heading', { name: 'New city' })).toBeVisible();
    await page.getByLabel('City name').fill('Harbor City');
    await page.getByLabel('Country', { exact: true }).selectOption({ label: country });
    await page.getByLabel('State', { exact: true }).selectOption({ label: 'North Province' });
    await page.getByRole('button', { name: 'Create city' }).click();
    await expect(page.getByRole('heading', { name: 'Harbor City' })).toBeVisible();

    // Lookups were invalidated: the employee form cascade offers the new places.
    await nav.getByRole('link', { name: 'Employees' }).click();
    await page.getByRole('link', { name: 'New employee' }).click();
    // Wait for the form: the list page has a "Filter by country" select too.
    await expect(page.getByRole('heading', { name: 'New employee' })).toBeVisible();
    await page.getByLabel('Country', { exact: true }).selectOption({ label: country });
    await page.getByLabel('State', { exact: true }).selectOption({ label: 'North Province' });
    await page.getByLabel('City', { exact: true }).selectOption({ label: 'Harbor City' });
  });

  test('duplicate names are rejected by the server under the field', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/countries/new');
    await page.getByLabel('Country name').fill('india');
    await page.getByRole('button', { name: 'Create country' }).click();
    await expect(page.getByText('A country with this name already exists')).toBeVisible();
  });

  test('a country still in use cannot be deleted (409 shown inline)', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/countries?search=india');
    await waitForRows(page);
    await tableRows(page).first().getByRole('button', { name: 'Delete India' }).click();
    await tableRows(page).first().getByRole('button', { name: 'Confirm delete India' }).click();
    await expect(page.getByRole('alert')).toContainText('India has 3 states');
  });

  test('rename a city, then delete an unused one', async ({ page }) => {
    await loginAs(page, 'admin');
    const name = `Tmp City ${String(Date.now()).slice(-6)}`;
    await page.goto('/cities/new');
    await page.getByLabel('City name').fill(name);
    await page.getByLabel('Country', { exact: true }).selectOption({ label: 'Canada' });
    await page.getByLabel('State', { exact: true }).selectOption({ label: 'Ontario' });
    await page.getByRole('button', { name: 'Create city' }).click();
    await expect(page.getByRole('heading', { name })).toBeVisible();

    await page.getByLabel('City name').fill(`${name} Renamed`);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    await expect(page.getByRole('heading', { name: `${name} Renamed` })).toBeVisible();

    await page.getByRole('button', { name: `Delete ${name} Renamed` }).click();
    await page.getByRole('button', { name: `Confirm delete ${name} Renamed` }).click();
    await expect(page).toHaveURL(/\/cities(?:\?|$)/);
    await expect(page.getByRole('link', { name: `${name} Renamed` })).toHaveCount(0);
  });

  test('cities list filters by country then state (URL-driven)', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/cities');
    await waitForRows(page);
    await page.getByLabel('Filter by country').selectOption({ label: 'United States' });
    await expect(page).toHaveURL(/countryId=2/);
    await page.getByLabel('Filter by state').selectOption({ label: 'Texas' });
    await expect(page).toHaveURL(/stateId=5/);
    await expect
      .poll(async () => (await tableRows(page).allInnerTexts()).every((row) => row.includes('Texas')))
      .toBe(true);
  });
});
