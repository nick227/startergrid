import { test, expect } from '@playwright/test';

test('sign-in help preserves input, supports article links, and restores keyboard focus', async ({ page }) => {
  await page.route(url => url.pathname.startsWith('/api/'), route => route.fulfill({ status: 401, json: { error: 'Sign in' } }));
  await page.goto('./#/');
  await page.getByLabel('Email', { exact: true }).fill('person@example.test');
  const trigger = page.getByRole('button', { name: 'Help', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Help', exact: true })).toBeVisible();
  await dialog.getByPlaceholder('Search help…').fill('pause');
  await dialog.getByRole('button', { name: /What does Autopilot do/ }).click();
  await expect(dialog.getByRole('heading', { name: 'Automatic updates and pausing' })).toBeVisible();
  const articleLink = dialog.locator('.doc-reader-prose button.doc-link').first();
  await expect(articleLink).toBeVisible();
  const articleTitle = await dialog.getByRole('heading', { level: 2 }).first().textContent();
  await articleLink.click();
  await expect(dialog.getByRole('heading', { level: 2 }).first()).not.toHaveText(articleTitle!);
  await dialog.getByRole('button', { name: '← All help' }).click();
  await expect(dialog.getByRole('searchbox', { name: 'Search help', exact: true })).toHaveValue('pause');
  await dialog.getByRole('button', { name: 'Close help' }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.locator(':focus')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('person@example.test');
});

test('staff get contextual help and can leave the standalone help page', async ({ page }) => {
  await page.route(url => url.pathname.startsWith('/api/'), route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { id: 'support', email: 'support@test.local', role: 'INTERNAL_SUPPORT', dealerAccessIds: [], mustChangePassword: false } });
    if (path === '/api/admin/dealerships') return route.fulfill({ json: { dealerships: [] } });
    if (path === '/api/dealers') return route.fulfill({ json: { dealers: [] } });
    return route.fulfill({ status: 503, json: { error: 'Not configured' } });
  });
  await page.goto('./#/admin/dealers');
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('region', { name: 'Help for this page' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close help' }).click();
  await expect(page).toHaveURL(/#\/admin\/dealers$/);
  await page.goto('./#/help');
  await expect(page.getByRole('heading', { name: 'Help', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '← Back', exact: true }).click();
  await expect(page).not.toHaveURL(/#\/help$/);
});

test('dealer header offers help for the current workflow', async ({ page }) => {
  await page.route(url => url.pathname.startsWith('/api/'), route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { id: 'owner', email: 'owner@test.local', role: 'DEALER_OWNER', dealerAccessIds: ['d1'], mustChangePassword: false } });
    if (path === '/api/dealers') return route.fulfill({ json: { dealers: [{ id: 'd1', legalName: 'Test Motors', businessCategory: 'AUTOMOTIVE' }] } });
    return route.fulfill({ status: 503, json: { error: 'Not configured' } });
  });
  await page.goto('./#/d1/settings');
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('region', { name: 'Help for this page' })).toContainText('Invitations and sign-in help');
  await dialog.getByRole('button', { name: 'Close help' }).click();
  await expect(page).toHaveURL(/#\/d1\/settings$/);
});


test('mobile signup help recovers from an empty search without leaving signup', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(url => url.pathname.startsWith('/api/'), route => route.fulfill({ status: 401, json: { error: 'Sign in' } }));
  await page.goto('./#/signup');
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const search = dialog.getByRole('searchbox', { name: 'Search help', exact: true });
  await search.fill('zzzz-no-matching-article');
  await expect(dialog.getByText('No matching help found')).toBeVisible();
  await dialog.getByRole('button', { name: 'Clear search and browse help' }).click();
  await expect(search).toHaveValue('');
  await expect(dialog.getByRole('region', { name: 'Help for this page' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Close help' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/#\/signup$/);
});
