#!/usr/bin/env node
/**
 * Marketplace deploy smoke checks — HTTP only, no browser.
 *
 *   npm run smoke:marketplace
 *   BASE_URL=https://your-api.example.com npm run smoke:marketplace
 */

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const SELLER_ROLE_CATEGORIES = ['apartments', 'homes', 'commercial-property', 'vacation-rentals'];
const LIVE_SECOND_CATEGORIES = ['BOATS', 'TRAILERS_POWERSPORTS_RV'];

let failed = false;

function formatDetails(details) {
  if (!details) return '';
  const parts = Object.entries(details)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => `${key}=${value}`);
  return parts.length ? ` ${parts.join(' ')}` : '';
}

function pass(name, details) {
  console.log(`PASS ${name}${formatDetails(details)}`);
}

function fail(name, detail) {
  console.log(`FAIL ${name} — ${detail}`);
  failed = true;
}

function feedItemCount(body) {
  if (!body || !Array.isArray(body.items)) return 0;
  return body.items.length;
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
      pass('sites', { count: body.sites.length });
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
      pass('feed', { category: 'AUTOMOTIVE', count: feedItemCount(body) });
      return body;
    }
    fail('feed', `category=AUTOMOTIVE expected 200 feed shape, got ${status}`);
  } catch (err) {
    fail('feed', err instanceof Error ? err.message : String(err));
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
    fail('detail', 'no vehicle listing found in feed or vehicles list');
    return null;
  }

  try {
    const { status, body } = await request(
      'GET',
      `/api/marketplace/vehicles/${encodeURIComponent(listingId)}?category=AUTOMOTIVE`,
    );
    if (status === 200 && body?.vehicle && body?.promotion && body?.ctas) {
      pass('detail', { listingId, category: 'AUTOMOTIVE' });
      return listingId;
    }
    fail('detail', `listingId=${listingId} expected 200 detail, got ${status}`);
  } catch (err) {
    fail('detail', err instanceof Error ? err.message : String(err));
  }
  return listingId;
}

async function checkKeywordSearch() {
  try {
    const { status, body } = await request('GET', '/api/marketplace/feed?category=AUTOMOTIVE&q=toyota&limit=6');
    if (status === 200 && isFeedResponse(body)) {
      pass('keyword search', { category: 'AUTOMOTIVE', count: feedItemCount(body) });
      return;
    }
    fail('keyword search', `category=AUTOMOTIVE expected 200 feed shape, got ${status}`);
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
      pass('facet filter', { category: 'AUTOMOTIVE', count: feedItemCount(body) });
      return;
    }
    fail('facet filter', `category=AUTOMOTIVE expected 200 feed shape, got ${status}`);
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
        pass('seller filter', { category, count: feedItemCount(body) });
        return;
      }
      if (status === 404 && body?.error === 'Marketplace category not available') {
        continue;
      }
      fail('seller filter', `category=${category} unexpected status ${status}`);
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
      pass('seller filter', { category: 'AUTOMOTIVE', count: feedItemCount(body) });
      return;
    }
    fail('seller filter', `category=AUTOMOTIVE expected 200 feed, got ${status}`);
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
      pass('invalid report validation', { listingId: targetId });
      return;
    }
    fail('invalid report validation', `listingId=${targetId} expected 400, got ${status}`);
  } catch (err) {
    fail('invalid report validation', err instanceof Error ? err.message : String(err));
  }
}

async function checkDisabledCategoryGuard() {
  try {
    const { status, body } = await request('GET', '/api/marketplace/feed?category=SONGS&limit=6');
    if (status === 404 && body?.error === 'Marketplace category not available') {
      pass('disabled category guard', { category: 'SONGS' });
      return;
    }
    fail('disabled category guard', `category=SONGS expected 404, got ${status}`);
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
        pass('feed', { category, count: feedItemCount(body) });
        return;
      }
    } catch {
      // try next category
    }
  }
  fail('feed', `category=${LIVE_SECOND_CATEGORIES.join('|')} expected 200 feed`);
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
      pass('cross-category detail guard', { listingId: automotiveListingId, category: 'BOATS' });
      return;
    }
    fail('cross-category detail guard', `listingId=${automotiveListingId} expected 404, got ${status}`);
  } catch (err) {
    fail('cross-category detail guard', err instanceof Error ? err.message : String(err));
  }
}

async function main() {
  console.log(`Marketplace smoke BASE_URL: ${BASE_URL}\n`);

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
