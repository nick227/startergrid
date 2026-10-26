import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { API_PORT, STAFF } from './journey/database.ts';

// One dealership from creation to handoff against the real API and a migrate-only database.
// Browser steps are the ones people take; inventory and the buyer inquiry go through the
// same public API the app and marketplace use.

const API = `http://127.0.0.1:${API_PORT}`;
const stamp = Date.now();
const dealershipName = `Journey Motors ${stamp}`;
const owner = { email: `owner-${stamp}@e2e.test`, password: 'owner-password-123' };

async function signIn(page: Page, email: string, password: string) {
  await page.goto('./#/');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

async function json(request: APIRequestContext, method: 'get' | 'post' | 'put' | 'patch', path: string, data?: unknown) {
  const res = await request[method](path, data === undefined ? undefined : { data });
  const body = await res.json().catch(() => null);
  expect(res.ok(), `${method.toUpperCase()} ${path} → ${res.status()} ${JSON.stringify(body)}`).toBe(true);
  return body;
}

test('a new dealership goes from creation to a verified handoff', async ({ browser }) => {
  const staffContext = await browser.newContext();
  const staff = await staffContext.newPage();
  let dealershipId = '';
  let setupUrl = '';

  await test.step('staff create the dealership with just the essentials', async () => {
    await signIn(staff, STAFF.email, STAFF.password);
    await staff.goto('./#/admin/dealers');
    await staff.getByRole('button', { name: 'Add dealership' }).first().click();
    const dialog = staff.getByRole('dialog');
    await dialog.getByLabel('Dealership name').fill(dealershipName);
    await dialog.getByLabel('Owner email').fill(owner.email);
    await dialog.getByRole('button', { name: 'Create dealership' }).click();
    await expect(dialog.getByRole('heading', { name: `${dealershipName} is set up` })).toBeVisible();
    await expect(dialog.getByRole('alert')).toHaveCount(0); // channel setup finished
    setupUrl = (await dialog.locator('.select-all').textContent())?.trim() ?? '';
    expect(setupUrl).toMatch(/#\/invite\//);
    await dialog.getByRole('button', { name: 'Open dealership' }).click();
    await expect(staff).toHaveURL(/#\/admin\/dealers\/[^/]+$/);
    dealershipId = staff.url().split('/').pop()!;
    await expect(staff.getByRole('heading', { name: dealershipName })).toBeVisible();
  });

  await test.step('handoff is not offered before the owner signs in', async () => {
    await expect(staff.getByRole('button', { name: 'Complete handoff' })).toHaveCount(0);
  });

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();

  await test.step('the owner accepts the invitation and lands in their dealership', async () => {
    await ownerPage.goto(setupUrl);
    await expect(ownerPage.getByRole('heading', { name: /Set up your login/ })).toBeVisible();
    await ownerPage.getByLabel('New password', { exact: true }).fill(owner.password);
    await ownerPage.getByLabel('Confirm new password').fill(owner.password);
    await ownerPage.getByRole('button', { name: 'Create login and continue' }).click();
    await expect(ownerPage).toHaveURL(new RegExp(`#/${dealershipId}$`));
  });

  let vehicleId = '';
  await test.step('the owner adds a priced vehicle with a photo and publishes it to the marketplace', async () => {
    const api = ownerContext.request;
    const vehicle = await json(api, 'post', `/api/dealers/${dealershipId}/inventory/automotive/vehicles`,
      { vin: '1HGCM82633A004352', stockNumber: `J-${stamp}`, priceCents: 1_850_000, mileage: 42_000, condition: 'USED' });
    vehicleId = vehicle.vehicleId ?? vehicle.vehicle?.id ?? vehicle.id;
    expect(vehicleId).toBeTruthy();
    await json(api, 'post', `/api/dealers/${dealershipId}/inventory/vehicles/${vehicleId}/media`,
      { urls: ['https://images.e2e.test/journey-front.jpg'] });
    await json(api, 'patch', `/api/dealers/${dealershipId}/inventory/vehicles/${vehicleId}/listing-status`, { listingStatus: 'READY' });
    await json(api, 'post', `/api/dealers/${dealershipId}/platforms/consumer-marketplace/listings`, { vehicleId });
    const listed = await json(api, 'get', `/api/marketplace/vehicles/${vehicleId}`);
    expect(JSON.stringify(listed)).toContain(vehicleId);
  });

  await test.step('handoff still waits for a marketplace inquiry to reach the shared inbox', async () => {
    await staff.reload();
    await expect(staff.getByRole('heading', { name: dealershipName })).toBeVisible();
    await expect(staff.getByRole('button', { name: 'Complete handoff' })).toHaveCount(0);
    const record = await json(staffContext.request, 'get', `/api/admin/dealerships/${dealershipId}`);
    const handoff = record.onboarding.steps.find((s: { stepKey: string }) => s.stepKey === 'HANDOFF');
    expect(handoff.status).toBe('BLOCKED');
  });

  await test.step('a buyer inquires from the public marketplace and it reaches the owner\'s Leads', async () => {
    const buyer = await browser.newContext();
    await json(buyer.request, 'post', `${API}/api/marketplace/vehicles/${vehicleId}/leads`,
      { contactName: 'Jordan Buyer', contactEmail: `buyer-${stamp}@e2e.test`, message: 'Is this still available?' });
    await buyer.close();
    await ownerPage.goto(`./#/${dealershipId}/leads`);
    await expect(ownerPage.getByText('Jordan Buyer').first()).toBeVisible();
  });

  await test.step('staff complete the handoff once the evidence is in', async () => {
    await staff.reload();
    const complete = staff.getByRole('button', { name: 'Complete handoff' }).first();
    await expect(complete).toBeVisible();
    await complete.click();
    const confirm = staff.getByRole('alertdialog', { name: `Hand ${dealershipName} over to the dealership?` });
    await expect(confirm).toContainText('does not certify email, SMS or CRM delivery');
    await confirm.getByRole('button', { name: 'Complete handoff' }).click();
    await expect(confirm).toHaveCount(0);
    await expect(staff.getByRole('button', { name: 'Complete handoff' })).toHaveCount(0);
    const record = await json(staffContext.request, 'get', `/api/admin/dealerships/${dealershipId}`);
    expect(record.onboarding.steps.find((s: { stepKey: string }) => s.stepKey === 'HANDOFF').status).toBe('COMPLETE');
  });

  await ownerContext.close();
  await staffContext.close();
});
