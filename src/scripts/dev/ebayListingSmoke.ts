/**
 * eBay listing end-to-end smoke test.
 *
 * Verifies the full create → publish → withdraw lifecycle against the real
 * eBay Sell Inventory API (sandbox or production).
 *
 * Prerequisites:
 *   - eBay OAuth already connected (run smoke:ebay-oauth first)
 *   - EBAY_CLIENT_ID / EBAY_CLIENT_SECRET / EBAY_RUNAME set
 *   - EBAY_FULFILLMENT_POLICY_ID / EBAY_PAYMENT_POLICY_ID / EBAY_RETURN_POLICY_ID set
 *     (Business Policies from your eBay seller account / sandbox seller account)
 *   - EBAY_MERCHANT_LOCATION_KEY set if your account requires it
 *   - At least one vehicle in the DB (or pass --vehicle-id=<id>)
 *
 * Usage:
 *   npm run smoke:ebay-listing
 *   npm run smoke:ebay-listing -- --dealer-id=<id> --vehicle-id=<id>
 *   npm run smoke:ebay-listing -- --skip-withdraw   (keep the listing live after the test)
 */

import 'dotenv/config';
import { prisma } from '../../lib/prisma.js';
import { buildApp } from '../../server/app.js';
import { CredentialStore } from '../../services/platform/clients/CredentialStore.js';
import { EbayOAuthClient } from '../../services/platform/clients/providers/EbayOAuthClient.js';
import { EbayListingClient } from '../../services/marketplace/EbayListingClient.js';

const PLATFORM_SLUG = 'ebay-motors';
const PROVIDER      = 'ebay' as const;
const DEV_OP        = process.env['DEV_OPERATOR_ID'] ?? 'smoke-ebay-listing';

let failures = 0;

function pass(label: string, detail = '') {
  console.log(`  ✅  ${label}${detail ? `  — ${detail}` : ''}`);
}
function fail(label: string, detail = '') {
  failures++;
  console.log(`  ❌  ${label}${detail ? `  — ${detail}` : ''}`);
}
function info(msg: string) { console.log(`       ${msg}`); }
function section(title: string) {
  console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`);
}
function assert(cond: boolean, passLabel: string, failLabel: string, detail = '') {
  if (cond) pass(passLabel, detail); else fail(failLabel, detail);
}
function argValue(flag: string): string | undefined {
  return process.argv.find(a => a.startsWith(`--${flag}=`))?.split('=').slice(1).join('=');
}
function hasFlag(flag: string): boolean {
  return process.argv.includes(`--${flag}`);
}

async function run() {
  const skipWithdraw = hasFlag('skip-withdraw');

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  eBay Listing Smoke Test');
  console.log('══════════════════════════════════════════════════════════');

  // ── Phase 1: Pre-flight ──────────────────────────────────────────────────────

  section('PHASE 1 · Pre-flight');

  const isSandbox = (process.env['EBAY_ENVIRONMENT'] ?? '').toLowerCase() === 'sandbox';
  info(`Environment: ${isSandbox ? 'SANDBOX' : 'PRODUCTION'}`);

  const required: Record<string, string | undefined> = {
    EBAY_CLIENT_ID:            process.env['EBAY_CLIENT_ID'],
    EBAY_CLIENT_SECRET:        process.env['EBAY_CLIENT_SECRET'],
    EBAY_RUNAME:               process.env['EBAY_RUNAME'],
    EBAY_FULFILLMENT_POLICY_ID: process.env['EBAY_FULFILLMENT_POLICY_ID'],
    EBAY_PAYMENT_POLICY_ID:    process.env['EBAY_PAYMENT_POLICY_ID'],
    EBAY_RETURN_POLICY_ID:     process.env['EBAY_RETURN_POLICY_ID'],
  };
  let preflightOk = true;
  for (const [key, val] of Object.entries(required)) {
    if (val) pass(`${key} set`);
    else { fail(`${key} missing`); preflightOk = false; }
  }

  const merchantLocationKey = process.env['EBAY_MERCHANT_LOCATION_KEY'];
  if (merchantLocationKey) pass('EBAY_MERCHANT_LOCATION_KEY set', merchantLocationKey);
  else info('EBAY_MERCHANT_LOCATION_KEY not set — offer will be created without location (may fail on some accounts)');

  if (!preflightOk) {
    console.log('\n  Fix missing env vars in .env and retry.\n');
    await prisma.$disconnect(); process.exit(1);
  }

  // ── Phase 2: Resolve dealer + vehicle ────────────────────────────────────────

  section('PHASE 2 · Resolve dealer + vehicle');

  let dealerId = argValue('dealer-id');
  if (!dealerId) {
    const row = await prisma.dealershipProfile.findFirst({ select: { id: true, legalName: true } });
    if (!row) { fail('Dealer found', 'no dealers — run npm run onboard:fake first'); await prisma.$disconnect(); process.exit(1); }
    dealerId = row.id;
    pass('Dealer', `${row.legalName} (${dealerId})`);
  } else {
    pass('Dealer ID from args', dealerId);
  }

  let vehicleId = argValue('vehicle-id');
  let stockNumber: string;
  if (!vehicleId) {
    const v = await prisma.vehicle.findFirst({
      where: { dealershipId: dealerId, removedAt: null, soldAt: null },
      select: { id: true, year: true, make: true, model: true, stockNumber: true },
    });
    if (!v) { fail('Vehicle found', 'no active vehicles for this dealer'); await prisma.$disconnect(); process.exit(1); }
    vehicleId = v.id;
    stockNumber = v.stockNumber;
    pass('Vehicle', `${v.year} ${v.make} ${v.model} (${vehicleId}) SKU=${stockNumber}`);
  } else {
    const v = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { stockNumber: true } });
    if (!v) { fail('Vehicle found', `no vehicle with id=${vehicleId}`); await prisma.$disconnect(); process.exit(1); }
    stockNumber = v.stockNumber;
    pass('Vehicle ID from args', `${vehicleId} SKU=${stockNumber}`);
  }

  // ── Phase 3: Verify OAuth token ───────────────────────────────────────────────

  section('PHASE 3 · Verify OAuth token + auto-refresh');

  const ebayClient = new EbayOAuthClient();
  let token: string;
  try {
    token = await CredentialStore.withFreshToken(prisma, dealerId, PROVIDER, ebayClient);
    pass('CredentialStore.withFreshToken succeeded', `${token.slice(0, 16)}…`);
  } catch (err: unknown) {
    fail('OAuth token available', err instanceof Error ? err.message : String(err));
    info('Run npm run smoke:ebay-oauth first to connect eBay OAuth.');
    await prisma.$disconnect(); process.exit(1);
  }

  // ── Phase 4: Upsert inventory item ────────────────────────────────────────────

  section('PHASE 4 · PUT /sell/inventory/v1/inventory_item/:sku');

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { media: { select: { url: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } } },
  });
  if (!vehicle) { fail('Vehicle row readable'); await prisma.$disconnect(); process.exit(1); }

  try {
    await EbayListingClient.upsertInventoryItem(token, {
      sku: vehicle.stockNumber,
      condition: vehicle.condition,
      title: `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ''}`,
      description: `${vehicle.condition} ${vehicle.year} ${vehicle.make} ${vehicle.model}. ${vehicle.mileage.toLocaleString()} miles. $${(vehicle.priceCents / 100).toLocaleString()}.`,
      imageUrls: vehicle.media.map(m => m.url),
      mileage: vehicle.mileage,
      year: vehicle.year,
      make: vehicle.make,
      vehicleModel: vehicle.model,
      trim: vehicle.trim,
      vin: vehicle.vin,
    });
    pass('Inventory item upserted', `SKU=${vehicle.stockNumber}`);
  } catch (err: unknown) {
    fail('Inventory item upsert', err instanceof Error ? err.message : String(err));
    await prisma.$disconnect(); process.exit(1);
  }

  // ── Phase 5: Create or update offer ──────────────────────────────────────────

  section('PHASE 5 · Create or update offer');

  const priceDollars = (vehicle.priceCents / 100).toFixed(2);
  const listingPolicies = {
    fulfillmentPolicyId: process.env['EBAY_FULFILLMENT_POLICY_ID']!,
    paymentPolicyId:     process.env['EBAY_PAYMENT_POLICY_ID']!,
    returnPolicyId:      process.env['EBAY_RETURN_POLICY_ID']!,
  };

  let offerId: string;
  const existing = await EbayListingClient.getOffer(token, vehicle.stockNumber);

  if (existing) {
    info(`Existing offer found: ${existing.offerId} (status=${existing.status})`);
    try {
      await EbayListingClient.updateOffer(token, existing.offerId, {
        priceSummary: { value: priceDollars, currency: 'USD' },
        listingPolicies,
        ...(merchantLocationKey ? { merchantLocationKey } : {}),
      });
      offerId = existing.offerId;
      pass('Offer updated', offerId);
    } catch (err: unknown) {
      fail('Offer update', err instanceof Error ? err.message : String(err));
      await prisma.$disconnect(); process.exit(1);
    }
  } else {
    info('No existing offer — creating new');
    try {
      offerId = await EbayListingClient.createOffer(token, {
        sku: vehicle.stockNumber,
        marketplaceId: 'EBAY_MOTORS_US',
        format: 'FIXED_PRICE',
        listingDescription: `${vehicle.year} ${vehicle.make} ${vehicle.model}. ${vehicle.mileage.toLocaleString()} miles.`,
        priceSummary: { value: priceDollars, currency: 'USD' },
        quantityLimitPerBuyer: 1,
        categoryId: '6001',
        listingPolicies,
        ...(merchantLocationKey ? { merchantLocationKey } : {}),
      });
      pass('Offer created', offerId);
    } catch (err: unknown) {
      fail('Offer creation', err instanceof Error ? err.message : String(err));
      info('Common causes:');
      info('  • Policy IDs wrong — check EBAY_FULFILLMENT/PAYMENT/RETURN_POLICY_ID');
      info('  • EBAY_MERCHANT_LOCATION_KEY required for this account');
      info('  • Sandbox seller account not configured with business policies');
      info('    → In sandbox: go to sandbox.ebay.com → Account → Business Policies');
      await prisma.$disconnect(); process.exit(1);
    }
  }

  // ── Phase 6: Publish offer ────────────────────────────────────────────────────

  section('PHASE 6 · Publish offer → get listingId');

  let listingId: string;
  try {
    listingId = await EbayListingClient.publishOffer(token, offerId);
    pass('Offer published', `listingId=${listingId}`);
    info(`Listing URL (sandbox): https://sandbox.ebay.com/itm/${listingId}`);
  } catch (err: unknown) {
    fail('Offer publish', err instanceof Error ? err.message : String(err));
    await prisma.$disconnect(); process.exit(1);
  }

  // ── Phase 7: Verify listing record via route ──────────────────────────────────

  section('PHASE 7 · Verify listing record via HTTP route');

  const app = buildApp(prisma);

  // Upsert the listing record so GET has something to find
  await prisma.marketplaceListing.upsert({
    where: { vehicleId_platformSlug: { vehicleId, platformSlug: PLATFORM_SLUG } },
    create: { dealershipId: dealerId, vehicleId, platformSlug: PLATFORM_SLUG, externalListingId: listingId, externalOfferId: offerId, status: 'ACTIVE', listedAt: new Date() },
    update: { externalListingId: listingId, externalOfferId: offerId, status: 'ACTIVE', listedAt: new Date(), endedAt: null, errorMessage: null },
  });

  const getRes = await app.inject({
    method: 'GET',
    url: `/api/dealers/${dealerId}/platforms/${PLATFORM_SLUG}/listings/${vehicleId}`,
    headers: { 'x-operator-id': DEV_OP },
  });
  assert(getRes.statusCode === 200, 'GET listing returns 200', `GET listing returned ${getRes.statusCode}`, getRes.body);
  const listing = (getRes.json() as { listing?: { status?: string; externalListingId?: string } }).listing;
  assert(listing?.status === 'ACTIVE',           'listing.status = ACTIVE',    `listing.status = ${listing?.status}`);
  assert(listing?.externalListingId === listingId, 'listing.externalListingId matches', `got ${listing?.externalListingId}`);

  // ── Phase 8: Withdraw offer ───────────────────────────────────────────────────

  if (skipWithdraw) {
    section('PHASE 8 · Withdraw offer (skipped — --skip-withdraw)');
    info(`Listing ${listingId} is still ACTIVE on eBay.`);
    info(`To end it later: DELETE /api/dealers/${dealerId}/platforms/${PLATFORM_SLUG}/listings/${vehicleId}`);
  } else {
    section('PHASE 8 · Withdraw offer');

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/dealers/${dealerId}/platforms/${PLATFORM_SLUG}/listings/${vehicleId}`,
      headers: { 'x-operator-id': DEV_OP },
    });
    assert(deleteRes.statusCode === 204, 'DELETE listing returns 204', `DELETE listing returned ${deleteRes.statusCode}`, deleteRes.body || '');

    const ended = await prisma.marketplaceListing.findUnique({
      where: { vehicleId_platformSlug: { vehicleId, platformSlug: PLATFORM_SLUG } },
    });
    assert(ended?.status === 'ENDED',  'listing.status = ENDED in DB', `listing.status = ${ended?.status}`);
    assert(!!ended?.endedAt,           'listing.endedAt set',          'listing.endedAt null');

    // Verify eBay no longer shows the offer as published
    const withdrawn = await EbayListingClient.getOffer(token, vehicle.stockNumber);
    if (withdrawn) {
      assert(
        withdrawn.status !== 'PUBLISHED',
        'eBay offer no longer PUBLISHED',
        `eBay offer still in status ${withdrawn.status}`,
        `offerId=${withdrawn.offerId}`
      );
    } else {
      pass('eBay offer gone after withdraw');
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────

  console.log(`\n${'═'.repeat(60)}`);
  if (failures === 0) {
    console.log('  ✅  All checks passed — eBay listing lifecycle is healthy');
    if (!skipWithdraw) console.log('  Inventory item + offer created, published, and withdrawn on eBay.');
  } else {
    console.log(`  ❌  ${failures} check(s) failed — see above for details`);
  }
  console.log(`${'═'.repeat(60)}\n`);

  await prisma.$disconnect();
  process.exit(failures > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('\nUnexpected error:', err);
  prisma.$disconnect().finally(() => process.exit(1));
});
