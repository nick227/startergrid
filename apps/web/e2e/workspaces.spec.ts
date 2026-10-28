import { test, expect, type Page } from '@playwright/test';
async function fixture(page: Page, role = 'DEALER_OWNER') {
  const threads: any[] = [];
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    const json = (value: unknown) => route.fulfill({ json: value });
    if (path === '/api/auth/me') return json({ id:'owner', email:'owner@example.test', role, dealerAccessIds:['d1'], mustChangePassword:false });
    if (path === '/api/dealers') return json({ dealers:[{ id:'d1',legalName:'Lakeview Motors',businessCategory:'AUTOMOTIVE' }] });
    if (path.endsWith('/business-activity')) return json({ events:[{ id:'e1',category:'leads',title:'New buyer inquiry',detail:'Alex · Storefront',occurredAt:'2026-10-28T12:00:00Z',href:'#/d1/activity/leads?leadId=l1',count:1 }],nextCursor:null });
    if (path.endsWith('/sales-register')) return json({ sales:[{ vehicleId:'v1',stockNumber:'S1',title:'2024 Ford F-150',inventoryOutcome:'Sold',statusChangedAt:'2026-10-27T12:00:00Z',transactionDate:null,salePriceCents:null,channel:null,evidence:null }],truncated:false });
    if (path.endsWith('/team') && method === 'GET') return json({ threads, members:[{id:'owner',email:'owner@example.test'}], truncated:false });
    if (path.endsWith('/team') && method === 'POST') { const body=route.request().postDataJSON(); threads.unshift({...body,id:'t1',authorEmail:'owner@example.test',createdAt:new Date().toISOString(),completedAt:null,comments:[]}); return json(threads[0]); }
    if (path.endsWith('/team/t1') && method === 'PATCH') { const body=route.request().postDataJSON(); Object.assign(threads[0], body, body.completed === undefined ? {} : {completedAt:body.completed ? new Date().toISOString():null}); return json({ok:true}); }
    if (path.endsWith('/team/t1/comments')) { threads[0].comments.push({id:'c1',body:route.request().postDataJSON().body,authorEmail:'owner@example.test',createdAt:new Date().toISOString()}); return json({ok:true}); }
    if (path.endsWith('/people')) return json({ people:[],invitations:[] });
    if (path.endsWith('/leads')) return json({ leads:[] });
    if (path.endsWith('/buyer-outreach')) return json({outreach:[]});
    if (path === '/api/admin/dealerships') return json({dealerships:[]});
    return route.fulfill({ status:503,json:{error:'Fixture has no data for this source'} });
  });
}
test('navigation, legacy links, contextual Help and factual sales register', async ({ page }, info) => {
  await fixture(page); await page.goto('/#/d1/home');
  const nav=page.getByRole('navigation',{name:'Main',exact:true});
  await expect(nav.getByRole('button')).toHaveText(['Activity','Channels','Vehicles','Team']);
  await expect(page.getByRole('navigation',{name:'Activity views'})).toBeVisible();
  await expect(page.getByRole('link',{name:'New buyer inquiry'})).toBeVisible();
  await page.getByRole('link',{name:'Sales',exact:true}).click();
  await expect(page.getByText('Price not recorded')).toBeVisible();
  await expect(page.getByText('Sale date not recorded')).toBeVisible();
  await expect(page.getByText('Source not confirmed')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({path:`/tmp/dealergrid-sales-${info.project.name}.png`,fullPage:true});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto('/#/d1/leads');
  await expect(page.getByRole('link',{name:'Leads',exact:true})).toHaveAttribute('aria-current','page');
  await expect(page.getByRole('link',{name:'Help (opens in a new tab)'})).toHaveAttribute('href','#/docs/app-lead-status');
  await page.goto('/#/d1/settings/team');
  await expect(page.getByRole('link',{name:'People',exact:true})).toHaveAttribute('aria-current','page');
  await page.getByRole('button',{name:'Reports',exact:true}).click();
  await expect(page).toHaveURL(/\/reports$/);
});
test('shared task create, assign, discuss, complete and reopen', async ({ page }, info) => {
  await fixture(page); await page.goto('/#/d1/team/tasks');
  await page.getByRole('button',{name:'Create task',exact:true}).click();
  await page.getByLabel('Title',{exact:true}).fill('Check truck photos');
  await page.getByLabel('What needs to be done?').fill('Review the vehicle photos before publishing.');
  await page.getByLabel('Assign to',{exact:true}).selectOption('owner');
  await page.getByRole('button',{name:'Create task',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Check truck photos'})).toBeVisible();
  await page.getByText('Discussion (0)',{exact:true}).click();
  await page.getByLabel('Comment on Check truck photos').fill('Photos reviewed.');
  await page.getByRole('button',{name:'Comment',exact:true}).click();
  await expect(page.getByText('Photos reviewed.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Mark complete'}).click();
  await expect(page.getByRole('button',{name:'Reopen task'})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading',{name:'Check truck photos'})).toBeVisible();
  await page.getByRole('button',{name:'Reopen task'}).click();
  await expect(page.getByRole('button',{name:'Mark complete'})).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({path:`/tmp/dealergrid-team-${info.project.name}.png`,fullPage:true});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test('support mode survives workspace navigation and foreign dealership is blocked', async ({ page }) => {
  await fixture(page,'INTERNAL_SUPPORT'); await page.goto('/#/d1/activity?support=true');
  await expect(page.getByRole('complementary',{name:'Support mode'})).toBeVisible();
  await page.getByRole('button',{name:'Team',exact:true}).click();
  await expect(page).toHaveURL(/team\?support=true$/);
  await page.getByRole('link',{name:'Tasks',exact:true}).click();
  await expect(page).toHaveURL(/team\/tasks\?support=true$/);
  await page.getByRole('button',{name:'Activity',exact:true}).click();
  await expect(page.getByRole('complementary',{name:'Support mode'})).toBeVisible();
  await page.goto('/#/foreign/team');
  await expect(page.getByRole('navigation',{name:'Team views'})).toHaveCount(0);
});
test('feed failure is visible instead of an empty success state', async ({ page }) => {
  await fixture(page);
  await page.route('**/business-activity', route => route.fulfill({status:503,json:{error:'Activity temporarily unavailable'}}));
  await page.goto('/#/d1/activity');
  await expect(page.getByRole('alert')).toContainText('Activity temporarily unavailable');
  await expect(page.getByText('No activity matches this view.')).toHaveCount(0);
});

test('board announcements and discussions persist across navigation', async ({ page }) => {
  await fixture(page); await page.goto('/#/d1/team');
  await page.getByRole('button', { name: 'Write a post' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Saturday opening');
  await page.getByLabel('Message', { exact: true }).fill('Please review the new arrivals before opening.');
  await page.getByRole('combobox').selectOption('ANNOUNCEMENT');
  await page.getByRole('button', { name: 'Publish post' }).click();
  await expect(page.getByRole('heading', { name: 'Saturday opening' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Saturday opening' })).toBeVisible();
});
test('vehicle import workflows remain reachable from primary navigation', async ({ page }) => {
  await fixture(page); await page.goto('/#/d1/activity');
  await page.getByRole('button', { name: 'Vehicles', exact: true }).click();
  await expect(page).toHaveURL(/\/inventory$/);
  await page.getByRole('button', { name: 'Import spreadsheet', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Spreadsheet data' })).toBeVisible();
});
