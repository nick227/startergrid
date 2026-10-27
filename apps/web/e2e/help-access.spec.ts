import { test, expect } from '@playwright/test';

async function dealerSession(page: import('@playwright/test').Page, role = 'DEALER_OWNER') {
  await page.route(url => url.pathname.startsWith('/api/'), route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { id: 'owner', email: 'owner@test.local', role, dealerAccessIds: ['d1'], mustChangePassword: false } });
    if (path === '/api/dealers') return route.fulfill({ json: { dealers: [{ id: 'd1', legalName: 'Test Motors', businessCategory: 'AUTOMOTIVE' }] } });
    if (path === '/api/admin/dealerships') return route.fulfill({ json: { dealerships: [] } });
    return route.fulfill({ status: 503, json: { error: 'Not configured' } });
  });
}

test('sign-in help opens its article separately and preserves entered email', async ({ page }) => {
  await page.route(url => url.pathname.startsWith('/api/'), route => route.fulfill({ status: 401, json: { error: 'Sign in' } }));
  await page.goto('./#/');
  await page.getByLabel('Email', { exact: true }).fill('person@example.test');
  const trigger = page.getByRole('link', { name: 'Help (opens in a new tab)' });
  const popupPromise = page.waitForEvent('popup');
  await trigger.click();
  const docs = await popupPromise;
  await expect(docs.getByRole('heading', { name: 'Invitations and sign-in help', exact: true })).toBeVisible();
  await expect(docs).toHaveURL(/#\/docs\/app-team-access$/);
  await docs.close();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('person@example.test');
  await expect(trigger).toBeFocused();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const [route, id] of [
  ['home', 'app-getting-started'], ['inventory', 'inventory-inventory-readiness'],
  ['platforms', 'app-channels'], ['leads', 'app-lead-status'], ['reports', 'app-reports'], ['settings', 'app-team-access'],
]) {
  test(`${route} offers direct documentation without adding a primary navigation destination`, async ({ page }) => {
    await dealerSession(page);
    await page.goto(`./#/d1/${route}`);
    const help = page.getByRole('link', { name: 'Help (opens in a new tab)' });
    await expect(help).toHaveAttribute('href', `#/docs/${id}`);
    await expect(help).toHaveAttribute('target', '_blank');
    await expect(page.getByRole('navigation', { name: 'Main', exact: true })).not.toContainText('Help');
  });
}

for (const [route, id] of [
  ['admin/dealers', 'staff-dealership-assistance'], ['admin/operations', 'staff-problems'],
  ['admin/settings', 'staff-settings'], ['admin/platforms', 'staff-integration-setup'],
]) {
  test(`staff context ${route} links to the relevant record`, async ({ page }) => {
    await dealerSession(page, 'SUPER_ADMIN');
    await page.goto(`./#/${route}`);
    await expect(page.getByRole('link', { name: 'Help (opens in a new tab)' })).toHaveAttribute('href', `#/docs/${id}`);
  });
}

test('search answers a CRM question and preserves query through navigation and reload', async ({ page }) => {
  await page.goto('./#/docs');
  await page.getByRole('searchbox', { name: 'Search documentation' }).fill("Why didn't my lead reach my CRM?");
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const answer = page.getByRole('link', { name: 'Why did my lead not reach my CRM?', exact: true });
  await expect(answer).toBeVisible();
  await expect(page.locator('main > ul > li').first()).toContainText('Why did my lead not reach my CRM?');
  await answer.click();
  await expect(page.getByRole('heading', { name: 'Why did my lead not reach my CRM?', exact: true })).toBeFocused();
  await expect(page.getByText('Manual handoff', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Why did my lead not reach my CRM?', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '← Documentation index' }).click();
  await expect(page.getByRole('searchbox')).toHaveValue("Why didn't my lead reach my CRM?");
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Why did my lead not reach my CRM?', exact: true })).toBeVisible();
});

test('metadata filters and related links work on mobile, and an unknown URL is recoverable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/docs?audience=developer&type=reference');
  await expect(page.getByRole('link', { name: 'Maintain feature documentation', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Maintain feature documentation', exact: true }).click();
  await page.getByText('Implementation references', { exact: true }).click();
  await expect(page.getByText('scripts/export-documentation.mjs', { exact: true })).toBeVisible();
  await page.getByRole('region', { name: 'Related documentation' }).getByRole('link', { name: 'Spreadsheet inventory import', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Spreadsheet inventory import', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'import', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Tag', exact: true })).toHaveValue('import');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto('./#/docs/missing-article');
  await expect(page.getByRole('heading', { name: 'Article not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Search the documentation index' }).click();
  await expect(page.getByRole('heading', { name: 'Documentation index', exact: true })).toBeVisible();
  await page.getByRole('searchbox').fill('zzzznomatchingarticle');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText(/No matching documentation/)).toBeVisible();
  await page.getByRole('link', { name: 'Clear search and filters' }).click();
  await expect(page.getByRole('searchbox')).toHaveValue('');
  await page.screenshot({ path: '/tmp/startergrid-doc-index-mobile.png', fullPage: true });
});

test('spreadsheet documentation preserves the open import and keyboard position', async ({ page }) => {
  await dealerSession(page);
  await page.goto('./#/d1/inventory');
  await page.getByRole('button', { name: 'Import spreadsheet', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Spreadsheet data' });
  const csv = 'stockNumber,vin\nSTK1,1HGCM82633A004352';
  await input.fill(csv);
  const trigger = page.getByRole('link', { name: /How to import and correct a spreadsheet/ });
  const popupPromise = page.waitForEvent('popup');
  await trigger.click();
  const docs = await popupPromise;
  await expect(docs.getByRole('heading', { name: 'Import and correct a spreadsheet', exact: true })).toBeVisible();
  await docs.close();
  await expect(input).toHaveValue(csv);
  await expect(trigger).toBeFocused();
});

test('old article identifiers and standalone help routes remain usable', async ({ page }) => {
  await page.goto('./#/docs/inventory/csv-import');
  await expect(page.getByRole('heading', { name: 'Import and correct a spreadsheet', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Permanent link' })).toHaveAttribute('href', '#/docs/inventory-csv-import');
  await page.goto('./#/help');
  await expect(page.getByRole('heading', { name: 'Documentation index', exact: true })).toBeVisible();
});
