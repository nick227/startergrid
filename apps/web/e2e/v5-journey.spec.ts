import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { API_PORT, STAFF, journeyDb } from './journey/database.ts';

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
    const early = await ownerContext.request.post(`${API}/api/marketplace/vehicles/${vehicleId}/leads`,
      { data: { contactName: 'Too Early', contactEmail: `early-${stamp}@e2e.test` } });
    expect(early.status(), 'an unpublished vehicle cannot collect public inquiries').toBe(404);
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

  await test.step('viewing the record never rewrites completion history', async () => {
    const db = journeyDb();
    try {
      const history = async () => (await db.dealershipOnboardingStep.findMany({ where: { dealershipId }, orderBy: { stepKey: 'asc' } }))
        .map((s: { stepKey: string; status: string; completedAt: Date | null; completedBy: string | null; evidenceJson: unknown }) =>
          [s.stepKey, s.status, s.completedAt?.toISOString() ?? null, s.completedBy, JSON.stringify(s.evidenceJson)]);
      const before = await history();
      expect(before.every(([, status, at]) => status === 'COMPLETE' && at)).toBe(true);
      const staffId = (await db.operatorAccount.findUnique({ where: { email: STAFF.email } })).id;
      expect(before.find(([key]) => key === 'HANDOFF')![3], 'handoff keeps the staff member who completed it').toBe(staffId);
      await new Promise(resolve => setTimeout(resolve, 1100));
      await staff.reload();
      await expect(staff.getByRole('heading', { name: dealershipName })).toBeVisible();
      await json(staffContext.request, 'get', `/api/admin/dealerships/${dealershipId}`);
      await json(staffContext.request, 'get', `/api/admin/dealerships/${dealershipId}/onboarding`);
      await json(staffContext.request, 'get', '/api/admin/dealerships?limit=50');
      await ownerPage.goto(`./#/${dealershipId}`);
      expect(await history()).toEqual(before);
    } finally {
      await db.$disconnect();
    }
  });

  await test.step('steps cannot be ticked by hand', async () => {
    const res = await staffContext.request.patch(`/api/admin/dealerships/${dealershipId}/onboarding`,
      { data: { stepKey: 'HANDOFF', status: 'IN_PROGRESS' } });
    expect(res.status()).toBe(400);
    await json(staffContext.request, 'patch', `/api/admin/dealerships/${dealershipId}/onboarding`, { waitingForStock: false });
  });

  await test.step('authorization boundaries hold for the dealer owner', async () => {
    const other = await json(staffContext.request, 'post', '/api/admin/dealerships',
      { legalName: `Other Motors ${stamp}`, businessCategory: 'AUTOMOTIVE', primaryContact: { email: `other-${stamp}@e2e.test` }, inviteOwnerEmail: `other-${stamp}@e2e.test` });
    const otherId = other.dealer.id;
    const db = journeyDb();
    const staffId = (await db.operatorAccount.findUnique({ where: { email: STAFF.email } })).id;
    await db.$disconnect();
    const o = ownerContext.request;
    const denied: Array<[string, Promise<{ status(): number }>]> = [
      ['owner opens the internal dealership record', o.get(`/api/admin/dealerships/${dealershipId}`)],
      ['owner completes handoff', o.post(`/api/admin/dealerships/${dealershipId}/handoff`)],
      ['owner edits onboarding', o.patch(`/api/admin/dealerships/${dealershipId}/onboarding`, { data: { waitingForStock: true } })],
      ['owner retries channel setup', o.post(`/api/admin/dealerships/${dealershipId}/channel-setup`)],
      ['owner creates a dealership', o.post('/api/admin/dealerships', { data: { legalName: `Rogue ${stamp}`, businessCategory: 'AUTOMOTIVE', primaryContact: { email: `rogue-${stamp}@e2e.test` } } })],
      ['owner invites internal support', o.post(`/api/dealers/${dealershipId}/people/invites`, { data: { email: `int-${stamp}@e2e.test`, accessRole: 'INTERNAL_SUPPORT' } })],
      ['owner issues an internal temporary login', o.post(`/api/dealers/${dealershipId}/people/temporary-login`, { data: { email: `int2-${stamp}@e2e.test`, accessRole: 'INTERNAL_SUPPORT' } })],
      ['owner resets the internal staff account', o.patch(`/api/dealers/${dealershipId}/people/${staffId}`, { data: { resetPassword: true } })],
      ['owner lists another dealership\'s people', o.get(`/api/dealers/${otherId}/people`)],
      ['owner reads another dealership\'s inventory', o.get(`/api/dealers/${otherId}/inventory`)],
      ['owner reads another dealership\'s leads', o.get(`/api/dealers/${otherId}/leads`)],
      ['owner invites into another dealership', o.post(`/api/dealers/${otherId}/people/invites`, { data: { email: `x-${stamp}@e2e.test`, accessRole: 'DEALER_STAFF' } })],
    ];
    for (const [label, pending] of denied) {
      const status = (await pending).status();
      expect([401, 403, 404], `${label} → ${status}`).toContain(status);
    }
    const allowed = await o.post(`/api/dealers/${dealershipId}/people/invites`, { data: { email: `staff-${stamp}@e2e.test`, accessRole: 'DEALER_STAFF' } });
    expect(allowed.status(), 'the owner can still invite their own staff').toBeLessThan(300);
    const people = await json(o, 'get', `/api/dealers/${dealershipId}/people`);
    expect(JSON.stringify(people)).toContain(owner.email);
  });

  await ownerContext.close();
  await staffContext.close();
});
