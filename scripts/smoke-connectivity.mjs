#!/usr/bin/env node
/**
 * Operator ↔ Marketplace connectivity smoke — HTTP only, no browser.
 *
 * Proves the minimum connectivity loop end to end against a running API:
 * operator-web pushes a product → it appears on the marketplace under the
 * matching dealership → marketplace engagement / lead / sold events flow
 * back into operator-web surfaces.
 *
 * Acceptance baseline: docs/connectivity-acceptance.md (checkpoints C1–C12).
 *
 *   npm run smoke:connectivity
 *   npm run smoke:connectivity -- --no-sold     # skip the sold/relist round-trip
 *   BASE_URL=https://api.example.com npm run smoke:connectivity
 *
 * Requires: API server running (npm run server:start) against a seeded dev DB
 * (npm run db:seed). Idempotent — restores the listing state it found.
 * Operator auth uses the dev x-operator-id header, so the server must not run
 * with NODE_ENV=production.
 */

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const OPERATOR_ID = process.env.OPERATOR_ID ?? 'connectivity-smoke';
const MARKETPLACE_SLUG = 'consumer-marketplace';
const RUN_SOLD = !process.argv.includes('--no-sold');

let failed = false;
let passCount = 0;

function formatDetails(details) {
  if (!details) return '';
  const parts = Object.entries(details)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => `${key}=${value}`);
  return parts.length ? ` ${parts.join(' ')}` : '';
}

function pass(name, details) {
  passCount += 1;
  console.log(`PASS ${name}${formatDetails(details)}`);
}

function fail(name, detail) {
  console.log(`FAIL ${name} — ${detail}`);
  failed = true;
}

// Hard failures abort the run — later checkpoints would only cascade-fail.
class AbortRun extends Error {}

function abort(name, detail) {
  fail(name, detail);
  throw new AbortRun(name);
}

async function request(method, path, { json, operator } = {}) {
  const url = `${BASE_URL}${path}`;
  const init = { method, headers: {} };
  if (operator) init.headers['x-operator-id'] = OPERATOR_ID;
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

const op = (method, path, json) => request(method, path, { json, operator: true });

// First value of `key` anywhere in the object tree — keeps the dealer-identity
// assertion stable if the detail response nests its dealer block.
function findDeep(value, key) {
  if (value == null || typeof value !== 'object') return undefined;
  if (!Array.isArray(value) && key in value) return value[key];
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    const found = findDeep(child, key);
    if (found !== undefined) return found;
  }
  return undefined;
}

// ── C1 health ─────────────────────────────────────────────────────────────────

async function checkHealth() {
  let res;
  try {
    res = await request('GET', '/health');
  } catch (err) {
    abort('C1 api-health', `cannot reach ${BASE_URL} (${err.message}) — start the server: npm run server:start`);
  }
  if (res.status !== 200 || res.body?.ok !== true) {
    abort('C1 api-health', `status=${res.status}`);
  }
  pass('C1 api-health', { baseUrl: BASE_URL });
}

// ── C2/C3 candidate selection ─────────────────────────────────────────────────

async function pickCandidate() {
  const { status, body } = await op('GET', '/api/dealers');
  if (status !== 200 || !Array.isArray(body?.dealers)) {
    abort('C2 seeded-dealership', `GET /api/dealers status=${status} — dev operator header rejected?`);
  }
  if (body.dealers.length === 0) {
    abort('C2 seeded-dealership', 'no dealerships — run npm run db:seed first');
  }
  pass('C2 seeded-dealership', { dealers: body.dealers.length });

  // Prefer the stable demo dealer, then any other dealer with a usable vehicle.
  const dealers = [...body.dealers].sort((a, b) =>
    (a.id === 'dealer_austin_auto' ? -1 : 0) - (b.id === 'dealer_austin_auto' ? -1 : 0));

  let fallback = null;
  for (const dealer of dealers) {
    const inv = await op('GET', `/api/dealers/${dealer.id}/inventory`);
    if (inv.status !== 200 || !Array.isArray(inv.body?.vehicles)) continue;

    const candidates = inv.body.vehicles.filter(v =>
      v.listingStatus === 'READY' && v.priceCents > 0 && !v.soldAt && !v.removedAt);
    if (candidates.length === 0) continue;

    const listings = await op('GET', `/api/dealers/${dealer.id}/platforms/${MARKETPLACE_SLUG}/listings`);
    const liveVehicleIds = new Set(
      (listings.body?.listings ?? []).filter(l => l.status === 'ACTIVE').map(l => l.vehicleId));

    const fresh = candidates.find(v => !liveVehicleIds.has(v.id));
    if (fresh) {
      pass('C3 publishable-unit', { dealer: dealer.id, vehicle: fresh.stockNumber });
      return { dealer, vehicle: fresh, preUnpublish: false };
    }
    fallback ??= { dealer, vehicle: candidates[0], preUnpublish: true };
  }

  if (fallback) {
    pass('C3 publishable-unit', {
      dealer: fallback.dealer.id,
      vehicle: fallback.vehicle.stockNumber,
      note: 'already-live; will unpublish first',
    });
    return fallback;
  }
  abort('C3 publishable-unit', 'no READY active vehicle with a price found in any dealership');
}

// ── main flow ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Operator ↔ Marketplace connectivity smoke against ${BASE_URL}`);
  console.log(`Sold round-trip: ${RUN_SOLD ? 'enabled' : 'skipped (--no-sold)'}\n`);

  await checkHealth();
  const { dealer, vehicle, preUnpublish } = await pickCandidate();
  const dealerId = dealer.id;
  const vehicleId = vehicle.id;
  const listingPath = `/api/dealers/${dealerId}/platforms/${MARKETPLACE_SLUG}/listings`;

  if (preUnpublish) {
    const res = await op('DELETE', `${listingPath}/${vehicleId}`);
    if (res.status !== 204) abort('C4 negative-baseline', `pre-unpublish failed status=${res.status}`);
  }

  // C4 — not on the marketplace before the push.
  {
    const res = await request('GET', `/api/marketplace/vehicles/${vehicleId}`);
    if (res.status !== 404) abort('C4 negative-baseline', `expected 404 before push, got ${res.status}`);
    pass('C4 negative-baseline');
  }

  // C5 — operator pushes the product to the marketplace.
  {
    const res = await op('POST', listingPath, { vehicleId });
    if (res.status !== 201 || res.body?.listing?.status !== 'ACTIVE') {
      abort('C5 push-listing', `status=${res.status} listingStatus=${res.body?.listing?.status ?? 'n/a'}`);
    }
    pass('C5 push-listing', { listingStatus: res.body.listing.status });
  }

  // C6 — marketplace serves it, attributed to the matching dealership.
  {
    const res = await request('GET', `/api/marketplace/vehicles/${vehicleId}`);
    if (res.status !== 200) abort('C6 marketplace-detail', `status=${res.status}`);
    const detailDealerId = findDeep(res.body, 'dealerId');
    if (detailDealerId !== dealerId) {
      fail('C6 marketplace-detail', `dealerId=${detailDealerId} expected ${dealerId}`);
    } else {
      pass('C6 marketplace-detail', { dealerId: detailDealerId });
    }
  }

  // C7 — the dealership's seller page contains the listing.
  {
    const res = await request('GET', `/api/marketplace/sellers/${dealerId}`);
    const vehicles = res.body?.vehicles;
    const found = res.status === 200 && Array.isArray(vehicles)
      && vehicles.some(v => v.listingId === vehicleId);
    if (!found) {
      fail('C7 seller-page', `status=${res.status} listing ${vehicleId} not in seller index`);
    } else {
      pass('C7 seller-page', { listings: vehicles.length });
    }
  }

  // C8 — engagement event flows back and increments dealer stats.
  {
    const before = await request('GET', `/api/marketplace/dealers/${dealerId}/stats`);
    const baseline = before.body?.vehicleDetailViews ?? 0;

    const ev = await request('POST', '/api/marketplace/events', {
      json: { eventType: 'vehicle_detail_view', listingId: vehicleId },
    });
    if (ev.status !== 202) {
      fail('C8 engagement-event', `event status=${ev.status}`);
    } else {
      const after = await request('GET', `/api/marketplace/dealers/${dealerId}/stats`);
      const now = after.body?.vehicleDetailViews ?? 0;
      if (now !== baseline + 1) {
        fail('C8 engagement-event', `vehicleDetailViews ${baseline} → ${now}, expected +1`);
      } else {
        pass('C8 engagement-event', { vehicleDetailViews: now });
      }
    }
  }

  // C9 — a marketplace lead lands in the operator leads API.
  {
    const res = await request('POST', `/api/marketplace/vehicles/${vehicleId}/leads`, {
      json: {
        contactName: 'Connectivity Smoke',
        contactEmail: 'connectivity-smoke@example.com',
        message: 'Automated connectivity check — safe to ignore.',
      },
    });
    const leadId = res.body?.leadId;
    if (res.status !== 201 || !leadId) {
      fail('C9 lead-roundtrip', `lead capture status=${res.status}`);
    } else {
      const opLeads = await op('GET', `/api/dealers/${dealerId}/leads?platformSlug=${MARKETPLACE_SLUG}&limit=200`);
      const match = (opLeads.body?.leads ?? []).find(l => l.id === leadId);
      if (!match) {
        fail('C9 lead-roundtrip', `leadId ${leadId} not in operator leads`);
      } else if (match.vehicleId !== vehicleId) {
        fail('C9 lead-roundtrip', `lead vehicleId=${match.vehicleId} expected ${vehicleId}`);
      } else {
        pass('C9 lead-roundtrip', { leadId });
      }
    }
  }

  // C10 — the lead shows up in operator demand reporting.
  {
    const res = await op('GET', `/api/dealers/${dealerId}/reports/observed-demand`);
    const asset = (res.body?.assets ?? []).find(a => a.assetId === vehicleId);
    if (res.status !== 200 || !asset || asset.observedLeads < 1) {
      fail('C10 observed-demand', `status=${res.status} observedLeads=${asset?.observedLeads ?? 'missing'}`);
    } else {
      pass('C10 observed-demand', { observedLeads: asset.observedLeads });
    }
  }

  // C11 — marketplace sold event reaches operator inventory.
  if (RUN_SOLD) {
    const sold = await request('POST', `/api/marketplace/vehicles/${vehicleId}/sold`);
    if (sold.status !== 200 || sold.body?.ok !== true) {
      fail('C11 sold-roundtrip', `sold status=${sold.status}`);
    } else {
      const gone = await request('GET', `/api/marketplace/vehicles/${vehicleId}`);
      const soldScope = await op('GET', `/api/dealers/${dealerId}/inventory?lifecycleScope=sold`);
      const inSold = (soldScope.body?.vehicles ?? []).some(v => v.id === vehicleId);
      // The sold event must also surface as an operator notification.
      const notes = await op('GET', `/api/dealers/${dealerId}/notifications?type=VEHICLE_SOLD_MARKETPLACE&limit=200`);
      const note = (notes.body?.notifications ?? []).find(n =>
        n.payload?.vehicleId === vehicleId && n.payload?.soldAt === sold.body.soldAt);
      if (gone.status !== 404) {
        fail('C11 sold-roundtrip', `listing still served after sold (status=${gone.status})`);
      } else if (!inSold) {
        fail('C11 sold-roundtrip', 'vehicle missing from operator sold scope');
      } else if (!note) {
        fail('C11 sold-roundtrip', 'VEHICLE_SOLD_MARKETPLACE notification not visible to operator');
      } else {
        pass('C11 sold-roundtrip', { soldAt: sold.body.soldAt, notificationId: note.id });
      }
    }
  }

  // C12 — restore the baseline so reruns start clean.
  {
    if (RUN_SOLD) {
      const relist = await op('POST', `/api/dealers/${dealerId}/inventory/vehicles/${vehicleId}/relist`);
      if (relist.status >= 300) {
        fail('C12 restore-baseline', `relist status=${relist.status}`);
      }
    }
    await op('DELETE', `${listingPath}/${vehicleId}`); // ends the listing; already ENDED after sold

    const detail = await request('GET', `/api/marketplace/vehicles/${vehicleId}`);
    const inv = await op('GET', `/api/dealers/${dealerId}/inventory`);
    const active = (inv.body?.vehicles ?? []).find(v => v.id === vehicleId);
    if (detail.status !== 404) {
      fail('C12 restore-baseline', `listing still live (status=${detail.status})`);
    } else if (!active || active.soldAt || active.removedAt) {
      fail('C12 restore-baseline', 'vehicle not back in active operator inventory');
    } else {
      pass('C12 restore-baseline', { vehicle: active.stockNumber, listingStatus: active.listingStatus });
    }
  }
}

main()
  .catch(err => {
    if (!(err instanceof AbortRun)) {
      console.error(err);
      failed = true;
    }
  })
  .finally(() => {
    console.log(`\n${failed ? 'RED' : 'GREEN'} — ${passCount} checkpoint(s) passed${failed ? ', see FAIL lines above' : ''}`);
    process.exit(failed ? 1 : 0);
  });
