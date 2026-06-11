import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

mkdirSync('C:/tmp/screenshots', { recursive: true });

const BASE = 'http://localhost:5177';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on('console', m => {
  if (m.type() === 'error') errors.push(m.text());
});

// 1. Log in as SUPER_ADMIN
await page.goto(BASE + '/');
await page.waitForTimeout(800);
await page.fill('input[type=email]', 'admin@example.invalid');
await page.fill('input[type=password]', 'Password123!');
await page.click('button[type=submit]');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'C:/tmp/screenshots/01_after_login.png', fullPage: true });
console.log('01 hash after login:', await page.evaluate(() => window.location.hash));

// 2. Admin overview
await page.goto(BASE + '/#/admin');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'C:/tmp/screenshots/02_admin_overview.png', fullPage: true });

// 3. Navigate to a known dealer from overview
const dealerLink = page.locator('a[href*="/admin/dealers/"]').first();
const dealerHref = await dealerLink.getAttribute('href').catch(() => null);
console.log('03 first dealer href:', dealerHref);

if (dealerHref) {
  await page.evaluate((href) => { window.location.hash = href.replace(/^#/, ''); }, dealerHref);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'C:/tmp/screenshots/03_admin_dealer_overview_tab.png', fullPage: true });
  console.log('03 dealer heading:', await page.locator('h2').first().textContent().catch(() => 'n/a'));

  // 4. Triage tab
  await page.click('button:has-text("Triage")');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'C:/tmp/screenshots/04_admin_dealer_triage_tab.png', fullPage: true });

  // 5. Blocked tab
  await page.click('button:has-text("Blocked")');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'C:/tmp/screenshots/05_admin_dealer_blocked_tab.png', fullPage: true });

  // 6. Audit tab
  await page.click('button:has-text("Audit")');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'C:/tmp/screenshots/06_admin_dealer_audit_tab.png', fullPage: true });
}

// 7. Not-found state
await page.evaluate(() => { window.location.hash = '/admin/dealers/DOES-NOT-EXIST-XYZ'; });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'C:/tmp/screenshots/07_admin_dealer_not_found.png', fullPage: true });
console.log('07 not-found body:', await page.locator('body').innerText().then(t => t.slice(0, 200)));

await browser.close();

console.log('\nConsole errors:', errors.length ? errors : 'none');
console.log('Screenshots saved to C:/tmp/screenshots/');
