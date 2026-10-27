/** CSV browser acceptance against the real API and a disposable database. */
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { chromium, expect, request } from '@playwright/test';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { createServer as createSocketServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildApp } from '../../dist/src/server/app.js';
import { hashPassword } from '../../dist/src/services/auth/passwordService.js';

const url = new URL(process.env.DATABASE_URL ?? 'file:missing');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || !url.pathname.startsWith('/startergrid_v5_test_')) {
  throw new Error('Use the disposable database runner: npm run verify:redesign');
}
const db = new PrismaClient();
const app = buildApp(db);
let vite, browser, admin, ownerContext;
let passed = false;
// Saved only on failure, next to the journey suite's traces so CI uploads both.
const tracePath = fileURLToPath(new URL('../../apps/web/test-results/csv-import-trace.zip', import.meta.url));
const cacheDir = await mkdtemp(path.join(tmpdir(), 'startergrid-csv-vite-'));
const failures = [];
try {
  await db.operatorAccount.create({ data: {
    email: 'redesign-admin@example.test', passwordHash: await hashPassword('local-acceptance-password'), role: 'SUPER_ADMIN',
  } });
  const api = await app.listen({ host: '127.0.0.1', port: 0 });
  const socket = createSocketServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const webPort = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  // Tailwind resolves its config from cwd; use the same cwd as `npm run dev -w`.
  process.chdir(fileURLToPath(new URL('../../apps/web', import.meta.url)));
  vite = await createServer({
    cacheDir, logLevel: 'error',
    root: fileURLToPath(new URL('../../apps/web', import.meta.url)),
    configFile: fileURLToPath(new URL('../../apps/web/vite.config.ts', import.meta.url)),
    server: { host: '127.0.0.1', port: webPort, strictPort: true, proxy: { '/api': { target: api, changeOrigin: true } } },
  });
  await vite.listen();
  const address = vite.httpServer.address();
  const ui = `http://127.0.0.1:${address.port}/app/`;
  process.env.APP_BASE_URL = ui.replace(/\/$/, '');
  admin = await request.newContext({ baseURL: api });
  async function json(response, status = 200) {
    assert.equal(response.status(), status, `${response.url()}: ${await response.text()}`);
    return response.json();
  }
  await json(await admin.post('/api/auth/login', { data: { email: 'redesign-admin@example.test', password: 'local-acceptance-password' } }));
  const created = await json(await admin.post('/api/admin/dealerships', { data: {
    legalName: 'Redesign Acceptance Motors', businessCategory: 'AUTOMOTIVE',
    primaryContact: { name: 'Test Owner', email: 'redesign-owner@example.test' },
    rooftopAddress: { street: '1 Test Street', city: 'Chicago', state: 'IL', postalCode: '60601' },
    inviteOwnerEmail: 'redesign-owner@example.test',
  } }), 201);
  const dealerId = created.dealer.id;
  assert.equal(created.invite.delivery, 'LINK_ONLY');
  // No email, SMS, webhook or buyer response is sent during public inquiry capture.
  await db.dealershipProfile.update({ where: { id: dealerId }, data: { notificationChannels: { email: { enabled: false } } } });
  await json(await admin.post(`/api/admin/dealerships/${dealerId}/handoff`), 409);

  browser = await chromium.launch({ headless: true });
  ownerContext = await browser.newContext();
  await ownerContext.tracing.start({ screenshots: true, snapshots: true });
  ownerContext.setDefaultTimeout(15_000);
  const page = await ownerContext.newPage();
  page.on('pageerror', error => failures.push(error.message));
  // External assets are unnecessary for this fixture; all application/API requests remain real.
  await ownerContext.route(url => !['127.0.0.1', 'localhost'].includes(url.hostname), route => route.abort());
  await page.goto(created.invite.setupUrl);
  await page.getByLabel('New password', { exact: true }).fill('owner-acceptance-password');
  await page.getByLabel('Confirm new password').fill('owner-acceptance-password');
  await page.getByRole('button', { name: 'Create login and continue' }).click();
  await expect(page).toHaveURL(new RegExp(`#/${dealerId}$`));
  await page.goto(`${ui}#/${dealerId}/inventory`);
  await page.getByRole('button', { name: 'Import spreadsheet', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Import Inventory' })).toBeVisible();
  const csv = 'stock,vin,year,make,model,mileage,price,condition,color,photos\nACCEPT-1,,2024,Ford,F150,15000,28000,USED,Blue,https://example.test/photo.jpg';
  const transfer = await page.evaluateHandle(text => {
    const dt = new DataTransfer();
    dt.items.add(new File([text], 'inventory.csv', { type: 'text/csv' }));
    return dt;
  }, csv);
  await page.getByText('Drop a spreadsheet here, or').dispatchEvent('drop', { dataTransfer: transfer });
  await expect(page.getByLabel('Spreadsheet data')).toHaveValue(csv);
  await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  await page.getByRole('button', { name: 'Preview →', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Import 0 / })).toBeDisabled();
  await page.getByRole('button', { name: 'Edit row 1', exact: true }).click();
  await page.getByLabel('Row 1: vin', { exact: true }).fill('invalid');
  await page.getByRole('button', { name: 'Check corrected rows', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Check corrected rows', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Import 0 / })).toBeDisabled();
  await page.getByLabel('Row 1: vin', { exact: true }).fill('1FTFW1E50PFA12345');
  await page.getByLabel('Row 1: price', { exact: true }).fill('29,500');
  await expect(page.getByRole('button', { name: /^Import 0 / })).toBeDisabled();
  await page.getByRole('button', { name: 'Check corrected rows', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Import 1 / })).toBeEnabled();
  await page.getByRole('button', { name: /^Import 1 / }).click();
  await expect(page.getByRole('heading', { name: 'Import Inventory' })).toHaveCount(0);
  const vehicle = await db.vehicle.findFirstOrThrow({ where: { dealershipId: dealerId, stockNumber: 'ACCEPT-1' } });
  assert.equal(vehicle.vin, '1FTFW1E50PFA12345');
  assert.equal(vehicle.priceCents, 2_950_000);
  console.log('PASS: create, link-only invite, browser first login, CSV drop, correction, server revalidation and import.');

  await page.reload();
  await expect(page.getByRole('cell', { name: 'Ford', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '$29,500', exact: true })).toBeVisible();
  assert.deepEqual(failures, [], 'Browser runtime errors');
  console.log('PASS: corrected inventory persists after browser refresh.');
  passed = true;
} finally {
  if (ownerContext) {
    await ownerContext.tracing.stop(passed ? {} : { path: tracePath }).catch(() => {});
    if (!passed) console.log(`Saved failure trace: ${tracePath}`);
  }
  await browser?.close();
  await admin?.dispose();
  await vite?.close();
  await app.close();
  await db.$disconnect();
  await rm(cacheDir, { recursive: true, force: true });
}
