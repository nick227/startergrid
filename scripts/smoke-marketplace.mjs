#!/usr/bin/env node
/**
 * Marketplace deploy smoke checks — HTTP only, no browser.
 *
 *   npm run smoke:marketplace
 *   BASE_URL=https://your-api.example.com npm run smoke:marketplace
 */

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const SELLER_ROLE_CATEGORIES = ['apartments', 'homes', 'commercial_property', 'vacation_rentals'];
const LIVE_SECOND_CATEGORIES = ['BOATS', 'TRAILERS_POWERSPORTS_RV'];

let failed = false;

function pass(name) {
  console.log(`PASS ${name}`);
}

function fail(name, detail) {
  console.log(`FAIL ${name} — ${detail}`);
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
      pass('health');
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
      pass('sites');
      return;
    }
    fail('sites', `expected 200 { sites: [] }, got ${status}`);
  } catch (err) {
    fail('sites', err instanceof Error ? err.message : String(err));
  }
}

async function checkAutomotiveFeed() {
  try {
    const { status, body } = await request('GET', '/api/marketplace/feed?category=AUTOMOTIVE&limit=12');
    if (status === 200 && isFeedResponse(body)) {
      pass('automotive feed');
      return body;
    }
    fail('automotive feed', `expected 200 feed shape, got ${status}`);
  } catch (err) {
    fail('automotive feed', err instanceof Error ? err.message : String(err));
  }
  return null;
}

async function resolveAutomotiveListingId(feedBody) {
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
      pass('listing detail');
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
      pass('keyword search');
      return;
    }
    fail('keyword search', `expected 200 feed shape, got ${status}`);
  } catch (err) {
    fail('keyword search', err instanceof Error ? err.message : String(err));
  }
}

async function checkFacetFilter() {
  try {
    const { status, body } = await request(
      'GET',
      '/api/marketplace/feed?category=AUTOMOTIVE&facets=bodyStyle:Sedan&limit=6',
    );
    if (status === 200 && isFeedResponse(body)) {
      pass('facet filter');
      return;
    }
    fail('facet filter', `expected 200 feed shape, got ${status}`);
  } catch (err) {
    fail('facet filter', err instanceof Error ? err.message : String(err));
  }
}

async function checkSellerFilter() {
  for (const category of SELLER_ROLE_CATEGORIES) {
    try {
      const { status, body } = await request(
        'GET',
        `/api/marketplace/feed?category=${category}&sellerName=SmokeTest&limit=6`,
      );
      if (status === 200 && isFeedResponse(body)) {
        pass('seller filter');
        return;
      }
      if (status === 404 && body?.error === 'Marketplace category not available') {
        continue;
      }
      fail('seller filter', `${category} unexpected status ${status}`);
      return;
    } catch (err) {
      fail('seller filter', err instanceof Error ? err.message : String(err));
      return;
    }
  }

  try {
    const { status, body } = await request(
      'GET',
      '/api/marketplace/feed?category=AUTOMOTIVE&sellerName=SmokeTest&limit=6',
    );
    if (status === 200 && isFeedResponse(body)) {
      pass('seller filter');
      return;
    }
    fail('seller filter', `automotive fallback expected 200 feed, got ${status}`);
  } catch (err) {
    fail('seller filter', err instanceof Error ? err.message : String(err));
  }
}

async function checkInvalidReportValidation(listingId) {
  const targetId = listingId ?? 'smoke-invalid-listing';
  try {
    const { status, body } = await request(
      'POST',
      `/api/marketplace/vehicles/${encodeURIComponent(targetId)}/report`,
      { json: { reason: 'NOT_A_VALID_REASON' } },
    );
    if (status === 400 && typeof body?.error === 'string') {
      pass('invalid report validation');
      return;
    }
    fail('invalid report validation', `expected 400, got ${status}`);
  } catch (err) {
    fail('invalid report validation', err instanceof Error ? err.message : String(err));
  }
}

async function checkDisabledCategoryGuard() {
  try {
    const { status, body } = await request('GET', '/api/marketplace/feed?category=SONGS&limit=6');
    if (status === 404 && body?.error === 'Marketplace category not available') {
      pass('disabled category guard');
      return;
    }
    fail('disabled category guard', `expected 404, got ${status}`);
  } catch (err) {
    fail('disabled category guard', err instanceof Error ? err.message : String(err));
  }
}

async function checkLiveSecondCategory() {
  for (const category of LIVE_SECOND_CATEGORIES) {
    try {
      const { status, body } = await request(
        'GET',
        `/api/marketplace/feed?category=${category}&limit=6`,
      );
      if (status === 200 && isFeedResponse(body)) {
        pass('live second category');
        return;
      }
    } catch {
      // try next category
    }
  }
  fail('live second category', `expected 200 feed for ${LIVE_SECOND_CATEGORIES.join(' or ')}`);
}

async function checkCrossCategoryDetailGuard(automotiveListingId) {
  if (!automotiveListingId) {
    fail('cross-category detail guard', 'no automotive listing id available');
    return;
  }

  try {
    const { status } = await request(
      'GET',
      `/api/marketplace/vehicles/${encodeURIComponent(automotiveListingId)}?category=BOATS`,
    );
    if (status === 404) {
      pass('cross-category detail guard');
      return;
    }
    fail('cross-category detail guard', `expected 404, got ${status}`);
  } catch (err) {
    fail('cross-category detail guard', err instanceof Error ? err.message : String(err));
  }
}

async function main() {
  console.log(`Marketplace smoke — ${BASE_URL}\n`);

  await checkHealth();
  await checkSites();
  const feedBody = await checkAutomotiveFeed();
  const listingId = await checkListingDetail(await resolveAutomotiveListingId(feedBody ?? null));
  await checkKeywordSearch();
  await checkFacetFilter();
  await checkSellerFilter();
  await checkInvalidReportValidation(listingId);
  await checkDisabledCategoryGuard();
  await checkLiveSecondCategory();
  await checkCrossCategoryDetailGuard(listingId);

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
