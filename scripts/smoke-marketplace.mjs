#!/usr/bin/env node
/**
 * Marketplace deploy smoke checks — HTTP only, no browser.
 * Usage: BASE_URL=http://localhost:3000 npm run smoke:marketplace
 */

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const SELLER_ROLE_CATEGORIES = ['apartments', 'homes', 'commercial_property', 'vacation_rentals'];

let failed = false;

function pass(name, detail = '') {
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  failed = true;
}

async function request(method, path, { json, headers } = {}) {
  const url = `${BASE_URL}${path}`;
  const init = { method, headers: { ...(headers ?? {}) } };
  if (json !== undefined) {
    init.headers['content-type'] = 'application/json';
    init.body = JSON.stringify(json);
  }
  const res = await fetch(url, init);
  let body = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body };
}

function isFeedResponse(body) {
  return Boolean(
    body
    && Array.isArray(body.items)
    && typeof body.totalEstimate === 'number'
    && body.appliedFilters
    && typeof body.appliedFilters === 'object',
  );
}

function firstVehicleListingId(body) {
  if (!body || !Array.isArray(body.items)) return null;
  for (const item of body.items) {
    if (item?.type === 'vehicle' && item.vehicle?.listingId) {
      return item.vehicle.listingId;
    }
  }
  return null;
}

async function checkHealth() {
  try {
    const { status, body } = await request('GET', '/health');
    if (status === 200 && body?.ok === true) {
      pass('health', `status ${status}`);
      return;
    }
    fail('health', `expected 200 { ok: true }, got ${status}`);
  } catch (err) {
    fail('health', err instanceof Error ? err.message : String(err));
  }
}

async function checkSites() {
  try {
    const { status, body } = await request('GET', '/api/marketplace/sites');
    if (status === 200 && Array.isArray(body?.sites)) {
      pass('marketplace sites', `${body.sites.length} site(s)`);
      return;
    }
    fail('marketplace sites', `expected 200 { sites: [] }, got ${status}`);
  } catch (err) {
    fail('marketplace sites', err instanceof Error ? err.message : String(err));
  }
}

async function checkFeed() {
  try {
    const { status, body } = await request('GET', '/api/marketplace/feed?category=AUTOMOTIVE&limit=12');
    if (status === 200 && isFeedResponse(body)) {
      pass('marketplace feed', `${body.items.length} item(s), estimate ${body.totalEstimate}`);
      return body;
    }
    fail('marketplace feed', `expected 200 feed shape, got ${status}`);
  } catch (err) {
    fail('marketplace feed', err instanceof Error ? err.message : String(err));
  }
  return null;
}

async function resolveListingId(feedBody) {
  let listingId = firstVehicleListingId(feedBody);
  if (listingId) return listingId;

  try {
    const { status, body } = await request('GET', '/api/marketplace/vehicles?category=AUTOMOTIVE&pageSize=1');
    if (status === 200 && Array.isArray(body?.vehicles) && body.vehicles[0]?.listingId) {
      return body.vehicles[0].listingId;
    }
  } catch {
    // fall through
  }
  return null;
}

async function checkListingDetail(listingId) {
  if (!listingId) {
    fail('listing detail', 'no vehicle listing found in feed or vehicles list');
    return null;
  }

  try {
    const { status, body } = await request(
      'GET',
      `/api/marketplace/vehicles/${encodeURIComponent(listingId)}?category=AUTOMOTIVE`,
    );
    if (status === 200 && body?.vehicle && body?.promotion && body?.ctas) {
      pass('listing detail', `listingId ${listingId}`);
      return listingId;
    }
    fail('listing detail', `expected 200 detail for ${listingId}, got ${status}`);
  } catch (err) {
    fail('listing detail', err instanceof Error ? err.message : String(err));
  }
  return listingId;
}

async function checkKeywordSearch() {
  try {
    const { status, body } = await request('GET', '/api/marketplace/feed?category=AUTOMOTIVE&q=toyota&limit=6');
    if (status === 200 && isFeedResponse(body)) {
      pass('keyword search (q)', `${body.items.length} item(s)`);
      return;
    }
    fail('keyword search (q)', `expected 200 feed shape, got ${status}`);
  } catch (err) {
    fail('keyword search (q)', err instanceof Error ? err.message : String(err));
  }
}

async function checkFacetQuery() {
  try {
    const { status, body } = await request(
      'GET',
      '/api/marketplace/feed?category=AUTOMOTIVE&facets=bodyStyle:Sedan&limit=6',
    );
    if (status === 200 && isFeedResponse(body)) {
      pass('facet query', `${body.items.length} item(s)`);
      return;
    }
    fail('facet query', `expected 200 feed shape, got ${status}`);
  } catch (err) {
    fail('facet query', err instanceof Error ? err.message : String(err));
  }
}

async function checkSellerNameOnSellerRoleCategory() {
  for (const category of SELLER_ROLE_CATEGORIES) {
    try {
      const { status, body } = await request(
        'GET',
        `/api/marketplace/feed?category=${category}&sellerName=SmokeTest&limit=6`,
      );
      if (status === 200 && isFeedResponse(body)) {
        pass('sellerName (seller-role category)', `${category} — ${body.items.length} item(s)`);
        return;
      }
      if (status === 404 && body?.error === 'Marketplace category not available') {
        continue;
      }
      fail('sellerName (seller-role category)', `${category} unexpected ${status}`);
      return;
    } catch (err) {
      fail('sellerName (seller-role category)', err instanceof Error ? err.message : String(err));
      return;
    }
  }

  // Seller-role categories are disabled in current consumer gate; verify gating on automotive.
  try {
    const { status, body } = await request(
      'GET',
      '/api/marketplace/feed?category=AUTOMOTIVE&sellerName=SmokeTest&limit=6',
    );
    if (status === 200 && isFeedResponse(body)) {
      pass(
        'sellerName (seller-role category)',
        'seller-role feeds disabled; automotive sellerName ignored (200 feed)',
      );
      return;
    }
    fail('sellerName (seller-role category)', `automotive fallback got ${status}`);
  } catch (err) {
    fail('sellerName (seller-role category)', err instanceof Error ? err.message : String(err));
  }
}

async function checkReportInvalidPayload(listingId) {
  const targetId = listingId ?? 'smoke-invalid-listing';
  try {
    const { status, body } = await request(
      'POST',
      `/api/marketplace/vehicles/${encodeURIComponent(targetId)}/report`,
      { json: { reason: 'NOT_A_VALID_REASON' } },
    );
    if (status === 400 && typeof body?.error === 'string') {
      pass('report invalid payload', `status ${status}`);
      return;
    }
    fail('report invalid payload', `expected 400, got ${status}`);
  } catch (err) {
    fail('report invalid payload', err instanceof Error ? err.message : String(err));
  }
}

async function main() {
  console.log(`Marketplace smoke — ${BASE_URL}\n`);

  await checkHealth();
  await checkSites();
  const feedBody = await checkFeed();
  const listingId = await checkListingDetail(await resolveListingId(feedBody ?? null));
  await checkKeywordSearch();
  await checkFacetQuery();
  await checkSellerNameOnSellerRoleCategory();
  await checkReportInvalidPayload(listingId);

  console.log('');
  if (failed) {
    console.log('Smoke result: FAIL');
    process.exit(1);
  }
  console.log('Smoke result: PASS');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
