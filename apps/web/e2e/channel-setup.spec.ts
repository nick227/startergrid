import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { STAFF, journeyDb } from './journey/database.ts';

// Channels against the real API and a migrate-only database: the overview, one page per
// channel, and CarGurus set up one step at a time while support and the provider take turns.

const stamp = Date.now();
const dealershipName = `Setup Motors ${stamp}`;
const owner = { email: `setup-owner-${stamp}@e2e.test`, password: 'owner-password-123' };
const staffMember = { email: `setup-staff-${stamp}@e2e.test`, password: 'staff-password-123' };

async function signIn(page: Page, email: string, password: string) {
  await page.goto('./#/');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

async function ok(request: APIRequestContext, method: 'post' | 'patch', path: string, data: unknown) {
  const res = await request[method](path, { data });
  const body = await res.json().catch(() => null);
  expect(res.ok(), `${method.toUpperCase()} ${path} → ${res.status()} ${JSON.stringify(body)}`).toBe(true);
  return body;
}

// Same-hash navigation does not reload the SPA; reload so pages fetch fresh state.
async function open(page: Page, hash: string) {
  await page.goto(`./${hash}`);
  await page.reload();
}

const currentStep = (page: Page) => page.locator('li[aria-current="step"]');
const yourChannels = (page: Page) => page.locator('section[aria-labelledby="your-channels"]');
const channelRow = (page: Page, name: string) => yourChannels(page).getByRole('link').filter({ hasText: name });
const purposeCard = (page: Page, label: string) => page.getByRole('button', { name: new RegExp(`^${label}`) });

test('channels: overview, one page per channel, and setup from start to connected', async ({ browser }) => {
  const staffContext = await browser.newContext();
  const staff = await staffContext.newPage();
  let dealershipId = '';
  let setupUrl = '';

  await test.step('staff create the dealership', async () => {
    await signIn(staff, STAFF.email, STAFF.password);
    await staff.goto('./#/admin/dealers');
    await staff.getByRole('button', { name: 'Add dealership' }).first().click();
    const dialog = staff.getByRole('dialog');
    await dialog.getByLabel('Dealership name').fill(dealershipName);
    await dialog.getByLabel('Owner email').fill(owner.email);
    await dialog.getByRole('button', { name: 'Create dealership' }).click();
    await expect(dialog.getByRole('heading', { name: `${dealershipName} is set up` })).toBeVisible();
    setupUrl = (await dialog.locator('.select-all').textContent())?.trim() ?? '';
    await dialog.getByRole('button', { name: 'Open dealership' }).click();
    await expect(staff).toHaveURL(/#\/admin\/dealers\/[^/]+$/);
    dealershipId = staff.url().split('/').pop()!;
  });

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await test.step('the owner signs in for the first time', async () => {
    await ownerPage.goto(setupUrl);
    await ownerPage.getByLabel('New password', { exact: true }).fill(owner.password);
    await ownerPage.getByLabel('Confirm new password').fill(owner.password);
    await ownerPage.getByRole('button', { name: 'Create login and continue' }).click();
    await expect(ownerPage).toHaveURL(new RegExp(`#/${dealershipId}$`));
  });

  const channels = `#/${dealershipId}/channels`;
  const cargurus = `#/${dealershipId}/channels/cargurus-dealer`;

  await test.step('the overview groups channels by purpose and adds a channel without a drawer', async () => {
    await open(ownerPage, channels);
    for (const label of ['Marketplaces', 'Social & Advertising', 'Inventory Feeds', 'Lead Delivery']) {
      await expect(purposeCard(ownerPage, label)).toBeVisible();
    }
    await purposeCard(ownerPage, 'Marketplaces').click();
    await expect(ownerPage.getByRole('heading', { name: 'Your marketplaces' })).toBeVisible();
    await ownerPage.locator('section[aria-labelledby="add-channel"]').getByRole('link').filter({ hasText: 'CarGurus' }).click();
    await expect(ownerPage).toHaveURL(new RegExp(`/channels/cargurus-dealer/setup$`));
    await expect(ownerPage.getByRole('dialog')).toHaveCount(0);
  });

  await test.step('initial setup leads with one plain next step and its owner', async () => {
    await expect(ownerPage.getByRole('heading', { name: 'Next: get a CarGurus account.' })).toBeVisible();
    await expect(ownerPage.getByText('0 of 4 steps done')).toBeVisible();
    const step = currentStep(ownerPage);
    await expect(step.getByText('Get a CarGurus account')).toBeVisible();
    await expect(step.getByText('You', { exact: true })).toBeVisible();
    await expect(step.getByRole('link', { name: /Go to CarGurus/ })).toHaveAttribute('target', '_blank');
    await expect(ownerPage.getByText('CarGurus approves you')).toBeVisible();
  });

  await test.step('activity and settings stay reachable while setup is incomplete', async () => {
    await ownerPage.getByRole('link', { name: 'Settings', exact: true }).click();
    await expect(ownerPage).toHaveURL(/\/channels\/cargurus-dealer\/settings$/);
    await expect(ownerPage.getByText('Send vehicles here')).toBeVisible();
    await expect(ownerPage.getByRole('heading', { name: 'Connection details' })).toBeVisible();
    await expect(ownerPage.getByText('CarGurus Dealer ID').first()).toBeVisible(); // dealer fields; technical ones are staff-only
    await ownerPage.getByRole('link', { name: 'Activity', exact: true }).click();
    await expect(ownerPage.getByRole('heading', { name: 'Recent activity' })).toBeVisible();
    await ownerPage.getByRole('link', { name: 'Overview', exact: true }).click();
    await expect(ownerPage.getByRole('heading', { name: 'Next: get a CarGurus account.' })).toBeVisible();
  });

  await test.step('a failed save is explained and nothing advances', async () => {
    await ownerPage.route(`**/api/dealers/${dealershipId}/accounts/cargurus-dealer`, route =>
      route.request().method() === 'PATCH' ? route.fulfill({ status: 500, json: { error: 'Server unavailable' } }) : route.continue());
    await currentStep(ownerPage).getByRole('button', { name: 'I asked them' }).click();
    await expect(currentStep(ownerPage).getByRole('alert')).toHaveText('Server unavailable');
    await ownerPage.unroute(`**/api/dealers/${dealershipId}/accounts/cargurus-dealer`);
  });

  await test.step('a self-reported step is marked as not confirmed, and the ID is checked', async () => {
    await currentStep(ownerPage).getByRole('button', { name: 'I asked them' }).click();
    await expect(currentStep(ownerPage).getByText('Enter your CarGurus Dealer ID')).toBeVisible();
    await expect(ownerPage.getByText('Marked done, not confirmed')).toBeVisible();
    const id = currentStep(ownerPage).getByLabel('CarGurus Dealer ID');
    await id.fill('12345');
    await currentStep(ownerPage).getByRole('button', { name: 'Save' }).click();
    await expect(currentStep(ownerPage).getByText('Must start with CG- followed by 5 digits')).toBeVisible();
    await id.fill('CG-12345');
    await currentStep(ownerPage).getByRole('button', { name: 'Save' }).click();
    await expect(ownerPage.getByRole('heading', { name: 'DealerGrid support is on it. Nothing for you to do right now.' })).toBeVisible();
    await expect(currentStep(ownerPage).getByRole('link', { name: 'Send to support' })).toHaveAttribute('href', /^mailto:.+subject=CarGurus%20setup%20help$/);
  });

  await test.step('waiting on the provider: the dealer can leave and the overview shows Setting up', async () => {
    await ok(staffContext.request, 'patch', `/api/dealers/${dealershipId}/accounts/cargurus-dealer`,
      { connectionConfig: { sftpUsername: 'dealer_12345', sftpPassword: 'not-a-real-secret' } });
    await open(ownerPage, cargurus);
    await expect(ownerPage.getByRole('heading', { name: 'Waiting for CarGurus. Nothing for you to do right now.' })).toBeVisible();
    await expect(ownerPage.getByText('You can leave this page.', { exact: false })).toBeVisible();
    await expect(currentStep(ownerPage).getByRole('button')).toHaveCount(0);
    await ownerPage.getByRole('button', { name: 'Back to Channels' }).last().click();
    await expect(channelRow(ownerPage, 'CarGurus')).toContainText('Setting up · waiting on CarGurus');
    await expect(purposeCard(ownerPage, 'Marketplaces')).toContainText('1 setting up');
  });

  await test.step('a failed connection check is shown as needing attention, with the fix as the next step', async () => {
    await ok(staffContext.request, 'patch', `/api/dealers/${dealershipId}/accounts/cars-com`, { accountId: 'CC-1', dealerEnabled: true });
    const db = journeyDb();
    try {
      // What the server records when a connection check fails (recordValidationAttempt).
      await db.platformAccount.update({
        where: { dealershipId_platformSlug: { dealershipId, platformSlug: 'cars-com' } },
        data: { state: 'FAILED', lastValidationStatus: 'AUTH_FAILED', lastValidatedAt: new Date() },
      });
    } finally {
      await db.$disconnect();
    }
    await open(ownerPage, channels);
    await expect(channelRow(ownerPage, 'Cars.com')).toContainText('Needs attention');
    await expect(channelRow(ownerPage, 'Cars.com')).toContainText('Cars.com did not accept the connection details.');
    await channelRow(ownerPage, 'Cars.com').click();
    await expect(ownerPage).toHaveURL(/\/channels\/cars-com$/);
    await expect(currentStep(ownerPage).getByText('did not accept these details', { exact: false })).toBeVisible();
  });

  await test.step('completed setup is Connected but never claimed as live', async () => {
    await ok(staffContext.request, 'patch', `/api/dealers/${dealershipId}/accounts/cargurus-dealer`, { state: 'ACTIVE' });
    await open(ownerPage, cargurus);
    await expect(ownerPage.locator('main header').getByText('Connected', { exact: true })).toBeVisible();
    await expect(ownerPage.getByText('Set up. No listings confirmed live yet.')).toBeVisible();
    const status = ownerPage.getByRole('region', { name: 'Status' });
    await expect(status.getByText('Not checked yet')).toBeVisible();
    await expect(status.getByText('0 vehicles')).toBeVisible();
    await ownerPage.getByRole('link', { name: 'See setup steps' }).click();
    await expect(ownerPage.getByRole('heading', { name: 'CarGurus is set up.' })).toBeVisible();
    await expect(ownerPage.getByText('Done (some steps marked by your team)')).toBeVisible();
    await open(ownerPage, channels);
    await expect(channelRow(ownerPage, 'CarGurus')).toContainText('Connected');
  });

  await test.step('old channel links still open the channel page', async () => {
    await open(ownerPage, `#/${dealershipId}/platforms/cargurus-dealer`);
    await expect(ownerPage.getByRole('heading', { level: 1, name: /CarGurus/ })).toBeVisible();
    await expect(ownerPage.getByRole('navigation', { name: 'Channel sections' })).toBeVisible();
  });

  await test.step('staff open a channel from the dealership record in support mode', async () => {
    await open(staff, `#/admin/dealers/${dealershipId}/destinations`);
    await channelRow(staff, 'CarGurus').click();
    await expect(staff).toHaveURL(/\/channels\/cargurus-dealer\?support=true$/);
    await expect(staff.getByRole('heading', { level: 1, name: /CarGurus/ })).toBeVisible();
    await staff.getByRole('link', { name: 'Settings', exact: true }).click();
    await expect(staff).toHaveURL(/\/channels\/cargurus-dealer\/settings\?support=true$/);
    await expect(staff.getByText('SFTP Password').first()).toBeVisible();   // advanced fields kept for support
    await expect(staff.getByText('Account record')).toBeVisible();           // internal tools kept
  });

  await test.step('dealership staff can follow setup but the owner finishes dealer steps', async () => {
    const temp = await ok(ownerContext.request, 'post', `/api/dealers/${dealershipId}/people/temporary-login`,
      { email: staffMember.email, accessRole: 'DEALER_STAFF' });
    const memberContext = await browser.newContext();
    await ok(memberContext.request, 'post', '/api/auth/login', { email: staffMember.email, password: temp.temporaryPassword });
    await ok(memberContext.request, 'post', '/api/auth/change-password', { currentPassword: temp.temporaryPassword, newPassword: staffMember.password });
    const member = await memberContext.newPage();
    await member.goto(`./#/${dealershipId}/channels/autotrader-cox`);
    await expect(member.getByRole('heading', { name: 'Next: get an Autotrader account.' })).toBeVisible();
    await expect(member.getByText('Your dealership owner finishes the steps marked “You”.', { exact: false })).toBeVisible();
    await expect(currentStep(member).getByRole('button')).toHaveCount(0);
    await memberContext.close();
  });

  await test.step('on a phone: overview, open a channel, switch sections, no sideways scrolling', async () => {
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await ownerContext.storageState() });
    const page = await phone.newPage();
    const noOverflow = async (where: string) => {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `no horizontal scrolling on ${where}`).toBeLessThanOrEqual(1);
    };
    await page.goto(`./${channels}`);
    await expect(purposeCard(page, 'Marketplaces')).toBeVisible();
    await noOverflow('the overview');
    await page.screenshot({ path: 'test-results/channels-overview-mobile.png' });
    await channelRow(page, 'CarGurus').click();
    await expect(page.getByRole('navigation', { name: 'Channel sections' })).toBeVisible();
    await noOverflow('the channel page');
    await page.getByRole('link', { name: 'Settings', exact: true }).tap();
    await expect(page.getByText('Send vehicles here')).toBeVisible();
    await noOverflow('channel settings');
    await page.goto(`./#/${dealershipId}/channels/autotrader-cox`);
    await expect(currentStep(page).getByRole('button', { name: 'I asked them' })).toBeVisible();
    await noOverflow('a channel in setup');
    await page.screenshot({ path: 'test-results/channel-setup-mobile.png' });
    await phone.close();
  });

  await open(ownerPage, channels);
  await expect(channelRow(ownerPage, 'CarGurus')).toBeVisible();
  await ownerPage.screenshot({ path: 'test-results/channels-overview-desktop.png', fullPage: true });
  await ownerContext.close();
  await staffContext.close();
});
