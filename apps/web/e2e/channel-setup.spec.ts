import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { STAFF } from './journey/database.ts';

// Guided channel setup against the real API and a migrate-only database: a new dealership
// works through CarGurus one step at a time while support and the provider take their turns.

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

const currentStep = (page: Page) => page.locator('li[aria-current="step"]');

test('a dealership sets up CarGurus one clear step at a time', async ({ browser }) => {
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

  // Same-hash navigation does not reload the SPA; reload so the page fetches the plan again.
  const cargurus = async () => {
    await ownerPage.goto(`./#/${dealershipId}/channels/cargurus-dealer`);
    await ownerPage.reload();
  };

  await test.step('the setup tab leads with one plain next step and its owner', async () => {
    await cargurus();
    await expect(ownerPage.getByRole('heading', { name: 'Next: get a CarGurus account.' })).toBeVisible();
    await expect(ownerPage.getByText('0 of 4 steps done')).toBeVisible();
    const step = currentStep(ownerPage);
    await expect(step.getByText('Get a CarGurus account')).toBeVisible();
    await expect(step.getByText('You', { exact: true })).toBeVisible();
    await expect(step.getByRole('link', { name: /Go to CarGurus/ })).toHaveAttribute('target', '_blank');
    await expect(ownerPage.getByText('CarGurus approves you')).toBeVisible(); // remaining steps are listed
    await expect(ownerPage.getByRole('button', { name: 'Save' })).toHaveCount(0); // only the current step acts
    await expect(ownerPage.getByText('More connection settings')).toBeVisible();   // advanced form kept, collapsed
    await expect(ownerPage.getByLabel('SFTP Password')).toBeHidden();
  });

  await test.step('a failed save is explained and nothing advances', async () => {
    await ownerPage.route(`**/api/dealers/${dealershipId}/accounts/cargurus-dealer`, route =>
      route.request().method() === 'PATCH' ? route.fulfill({ status: 500, json: { error: 'Server unavailable' } }) : route.continue());
    await currentStep(ownerPage).getByRole('button', { name: 'I asked them' }).click();
    await expect(currentStep(ownerPage).getByRole('alert')).toHaveText('Server unavailable');
    await expect(currentStep(ownerPage).getByText('Get a CarGurus account')).toBeVisible();
    await ownerPage.unroute(`**/api/dealers/${dealershipId}/accounts/cargurus-dealer`);
  });

  await test.step('a self-reported step is marked as not confirmed', async () => {
    await currentStep(ownerPage).getByRole('button', { name: 'I asked them' }).click();
    await expect(currentStep(ownerPage).getByText('Enter your CarGurus Dealer ID')).toBeVisible();
    await expect(ownerPage.getByText('Marked done, not confirmed')).toBeVisible();
    await expect(ownerPage.getByText('1 of 4 steps done')).toBeVisible();
  });

  await test.step('the dealer ID is checked before it saves', async () => {
    const id = currentStep(ownerPage).getByLabel('CarGurus Dealer ID');
    await id.fill('12345');
    await currentStep(ownerPage).getByRole('button', { name: 'Save' }).click();
    await expect(currentStep(ownerPage).getByText('Must start with CG- followed by 5 digits')).toBeVisible();
    await id.fill('CG-12345');
    await currentStep(ownerPage).getByRole('button', { name: 'Save' }).click();
    await expect(ownerPage.getByRole('heading', { name: 'StarterGrid support is on it. Nothing for you to do right now.' })).toBeVisible();
    const step = currentStep(ownerPage);
    await expect(step.getByText('StarterGrid', { exact: true })).toBeVisible();
    await expect(step.getByRole('link', { name: 'Send to support' })).toHaveAttribute('href', /^mailto:.+subject=CarGurus%20setup%20help$/);
  });

  await test.step('setup, connection and listings are reported separately', async () => {
    const strip = ownerPage.locator('dl');
    await expect(strip.getByText('2 of 4 done')).toBeVisible();
    await expect(strip.getByText('Not checked yet')).toBeVisible();
    await expect(strip.getByText('Starts after setup')).toBeVisible();
  });

  await test.step('after support connects the feed, the dealer is told who they are waiting on', async () => {
    await ok(staffContext.request, 'patch', `/api/dealers/${dealershipId}/accounts/cargurus-dealer`,
      { connectionConfig: { sftpUsername: 'dealer_12345', sftpPassword: 'not-a-real-secret' } });
    await cargurus();
    await expect(ownerPage.getByRole('heading', { name: 'Waiting for CarGurus. Nothing for you to do right now.' })).toBeVisible();
    await expect(ownerPage.getByText('CarGurus says approval usually takes 1–2 weeks.')).toBeVisible();
    await expect(currentStep(ownerPage).getByRole('button')).toHaveCount(0);
  });

  await test.step('approval marked by staff is set up, but not called verified or live', async () => {
    await ok(staffContext.request, 'patch', `/api/dealers/${dealershipId}/accounts/cargurus-dealer`, { state: 'ACTIVE' });
    await cargurus();
    await expect(ownerPage.getByRole('heading', { name: 'CarGurus is set up.' })).toBeVisible();
    await expect(ownerPage.getByText('Done (some steps marked by your team)')).toBeVisible();
    await expect(ownerPage.locator('dl').getByText('Not checked yet')).toBeVisible();
    await expect(ownerPage.locator('section[aria-labelledby="setup-headline"]')).not.toContainText(/\blive\b(?!;)|verified/i);
  });

  await test.step('a sign-in channel shows one sign-in button, or nothing while StarterGrid turns it on', async () => {
    // Whether Google is turned on for the site depends on the server's Google credentials.
    const { plan } = await (await ownerContext.request.get(`/api/dealers/${dealershipId}/channels/google-vehicle-ads/setup`)).json();
    await ownerPage.goto(`./#/${dealershipId}/channels/google-vehicle-ads`);
    if (plan.status === 'BLOCKED') {
      await expect(ownerPage.getByRole('heading', { name: /StarterGrid support is working on Google Vehicle Ads/ })).toBeVisible();
      await expect(ownerPage.getByRole('button', { name: /Sign in to Google/ })).toHaveCount(0);
    } else {
      await expect(ownerPage.getByRole('heading', { name: 'Next: sign in to Google.' })).toBeVisible();
      await expect(currentStep(ownerPage).getByRole('button', { name: 'Sign in to Google' })).toBeVisible();
      await expect(ownerPage.locator('section[aria-labelledby="setup-headline"]').getByRole('button')).toHaveCount(1);
    }
  });

  await test.step('dealership staff can follow setup but the owner finishes dealer steps', async () => {
    const temp = await ok(ownerContext.request, 'post', `/api/dealers/${dealershipId}/people/temporary-login`,
      { email: staffMember.email, accessRole: 'DEALER_STAFF' });
    const memberContext = await browser.newContext();
    await ok(memberContext.request, 'post', '/api/auth/login', { email: staffMember.email, password: temp.temporaryPassword });
    await ok(memberContext.request, 'post', '/api/auth/change-password', { currentPassword: temp.temporaryPassword, newPassword: staffMember.password });
    const member = await memberContext.newPage();
    await member.goto(`./#/${dealershipId}/channels/cars-com`);
    await expect(member.getByRole('heading', { name: 'Next: get a Cars.com account.' })).toBeVisible();
    await expect(member.getByText('Your dealership owner finishes the steps marked “You”.', { exact: false })).toBeVisible();
    await expect(currentStep(member).getByRole('button')).toHaveCount(0);
    await memberContext.close();
  });

  await test.step('on a phone the current step is readable and nothing scrolls sideways', async () => {
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await ownerContext.storageState() });
    const page = await phone.newPage();
    await page.goto(`./#/${dealershipId}/channels/cars-com`);
    await expect(page.getByRole('heading', { name: 'Next: get a Cars.com account.' })).toBeVisible();
    const step = currentStep(page);
    await expect(step.getByRole('button', { name: 'I asked them' })).toBeInViewport({ ratio: 0.5 }).catch(async () => {
      await step.getByRole('button', { name: 'I asked them' }).scrollIntoViewIfNeeded();
    });
    await expect(step.getByRole('button', { name: 'I asked them' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'no horizontal scrolling').toBeLessThanOrEqual(1);
    await page.screenshot({ path: 'test-results/channel-setup-mobile.png', fullPage: false });
    await phone.close();
  });

  await ownerPage.screenshot({ path: 'test-results/channel-setup-desktop.png', fullPage: true });
  await ownerContext.close();
  await staffContext.close();
});
