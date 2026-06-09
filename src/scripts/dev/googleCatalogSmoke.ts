/**
 * Google Vehicle Ads (Merchant Center) catalog smoke test.
 *
 * Verifies the full catalog sync lifecycle against the real Google Content API.
 *
 * Prerequisites:
 *   - Google OAuth connected (run smoke:google-oauth first)
 *   - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET set
 *   - --merchant-id=<id> (10-digit Merchant Center ID from merchants.google.com)
 *   - At least one vehicle in the DB
 *
 * Usage:
 *   npm run smoke:google-catalog -- --merchant-id=<id>
 *   npm run smoke:google-catalog -- --merchant-id=<id> --dealer-id=<id>
 *   npm run smoke:google-catalog -- --merchant-id=<id> --skip-delete
 */

import 'dotenv/config';
import { prisma } from '../../lib/prisma.js';
import { CredentialStore } from '../../services/platform/clients/CredentialStore.js';
import { GoogleOAuthClient } from '../../services/platform/clients/providers/GoogleOAuthClient.js';
import { GoogleMerchantClient } from '../../services/catalog/GoogleMerchantClient.js';
import { GoogleVehicleAdsBridge } from '../../services/catalog/bridges/GoogleVehicleAdsBridge.js';
import { CatalogSyncStore } from '../../services/catalog/CatalogSyncStore.js';
import { ContentPackageBuilder } from '../../services/distribution/ContentPackageBuilder.js';

const PLATFORM_SLUG = 'google-vehicle-ads';
const PROVIDER = 'google' as const;

let failures = 0;

function pass(label: string, detail = '') { console.log(`  ✅  ${label}${detail ? `  — ${detail}` : ''}`); }
function fail(label: string, detail = '') { failures++; console.log(`  ❌  ${label}${detail ? `  — ${detail}` : ''}`); }
function info(msg: string) { console.log(`       ${msg}`); }
function section(title: string) { console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`); }
function assert(cond: boolean, passLabel: string, failLabel: string, detail = '') {
  if (cond) pass(passLabel, detail); else fail(failLabel, detail);
}
function argValue(flag: string): string | undefined {
  return process.argv.find(a => a.startsWith(`--${flag}=`))?.split('=').slice(1).join('=');
}
function hasFlag(flag: string): boolean { return process.argv.includes(`--${flag}`); }

async function run() {
  const skipDelete = hasFlag('skip-delete');

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  Google Vehicle Ads (Merchant Center) Catalog Smoke Test');
  console.log('══════════════════════════════════════════════════════════');

  // ── Phase 1: Pre-flight ───────────────────────────────────────────────────

  section('PHASE 1 · Pre-flight');

  const merchantId = argValue('merchant-id');
  if (!merchantId) {
    fail('--merchant-id required');
    info('Find it at merchants.google.com → Account → Settings (10-digit ID)');
    await prisma.$disconnect(); process.exit(1);
  }
  pass('--merchant-id', merchantId);

  const required: Record<string, string | undefined> = {
    GOOGLE_CLIENT_ID:     process.env['GOOGLE_CLIENT_ID'],
    GOOGLE_CLIENT_SECRET: process.env['GOOGLE_CLIENT_SECRET'],
  };
  let preflightOk = true;
  for (const [key, val] of Object.entries(required)) {
    if (val) pass(`${key} set`);
    else { fail(`${key} missing`); preflightOk = false; }
  }
  if (!preflightOk) { info('Fix missing env vars in .env and retry.'); await prisma.$disconnect(); process.exit(1); }

  // ── Phase 2: Resolve dealer + vehicles ───────────────────────────────────

  section('PHASE 2 · Resolve dealer + vehicles');

  let dealerId = argValue('dealer-id');
  if (!dealerId) {
    const row = await prisma.dealershipProfile.findFirst({ select: { id: true, legalName: true } });
    if (!row) { fail('Dealer found', 'no dealers — run npm run onboard:fake first'); await prisma.$disconnect(); process.exit(1); }
    dealerId = row.id;
    pass('Dealer', `${row.legalName} (${dealerId})`);
  } else {
    pass('Dealer ID from args', dealerId);
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { dealershipId: dealerId, removedAt: null, soldAt: null },
    include: { media: { select: { url: true, sortOrder: true } } },
    take: 3,
  });
  if (vehicles.length === 0) {
    fail('Vehicles found', 'no active vehicles'); await prisma.$disconnect(); process.exit(1);
  }
  pass('Vehicles found', `${vehicles.length} (will sync up to 3)`);

  // ── Phase 3: OAuth token ──────────────────────────────────────────────────

  section('PHASE 3 · Verify OAuth token');

  const googleClient = new GoogleOAuthClient();
  let token: string;
  try {
    token = await CredentialStore.withFreshToken(prisma, dealerId, PROVIDER, googleClient);
    pass('CredentialStore.withFreshToken succeeded', `${token.slice(0, 16)}…`);
  } catch (err: unknown) {
    fail('OAuth token available', err instanceof Error ? err.message : String(err));
    info('Run npm run smoke:google-oauth first to connect Google OAuth.');
    await prisma.$disconnect(); process.exit(1);
  }

  // ── Phase 4: Verify Merchant Center access ────────────────────────────────

  section('PHASE 4 · Verify Merchant Center account access');

  try {
    const account = await GoogleMerchantClient.getAccount(token, merchantId);
    pass('Merchant Center accessible', `"${account.name}" (id=${account.id})`);
    if (account.websiteUrl) info(`Website: ${account.websiteUrl}`);
  } catch (err: unknown) {
    fail('Merchant Center accessible', err instanceof Error ? err.message : String(err));
    info('Ensure the Google account has Merchant Center access and the merchant ID is correct.');
    await prisma.$disconnect(); process.exit(1);
  }

  // ── Phase 5: Upsert vehicles ──────────────────────────────────────────────

  section('PHASE 5 · Upsert vehicles to Merchant Center');

  const bridge = new GoogleVehicleAdsBridge();
  const ctx = { dealershipId: dealerId, listingBaseUrl: process.env['APP_BASE_URL'] ?? 'http://localhost:3000' };
  const items = vehicles.map(v => bridge.buildItem(ContentPackageBuilder.fromVehicle(v, ctx), ctx));

  info(`Syncing ${items.length} item(s): ${items.map(i => i.id).join(', ')}`);

  let syncResult: { accepted: number; rejected: number; rejectedItems?: Array<{ itemId: string; errors: string[] }> };
  try {
    syncResult = await bridge.upsertItems(token, merchantId, items);
    assert(syncResult.accepted === items.length, 'All items accepted', `${syncResult.rejected} item(s) rejected`);
    if (syncResult.rejectedItems?.length) {
      syncResult.rejectedItems.forEach(r => info(`  Rejected itemId=${r.itemId}: ${r.errors.join(', ')}`));
    }
  } catch (err: unknown) {
    fail('Items upsert', err instanceof Error ? err.message : String(err));
    await prisma.$disconnect(); process.exit(1);
  }

  // ── Phase 6: Store catalog config ─────────────────────────────────────────

  section('PHASE 6 · Store catalog config');

  try {
    const config = await CatalogSyncStore.upsertConfig(prisma, dealerId, PLATFORM_SLUG, merchantId);
    await CatalogSyncStore.markSynced(prisma, dealerId, PLATFORM_SLUG, vehicles.length);
    pass('Catalog config stored', `id=${config.id}, merchantId=${merchantId}`);
  } catch (err: unknown) {
    fail('Catalog config store', err instanceof Error ? err.message : String(err));
  }

  // ── Phase 7: Delete one item ──────────────────────────────────────────────

  if (skipDelete) {
    section('PHASE 7 · Delete item (skipped — --skip-delete)');
    info(`Products from this test remain in Merchant Center ${merchantId}.`);
    info('Go to merchants.google.com → Products to manage them manually.');
  } else {
    section('PHASE 7 · Delete one product from Merchant Center');

    const deleteTarget = items[0].id;
    info(`Deleting product offerId=${deleteTarget} (productId=online:en:US:${deleteTarget})`);
    try {
      await bridge.deleteItem(token, merchantId, deleteTarget);
      pass('Product deleted', `offerId=${deleteTarget}`);
    } catch (err: unknown) {
      fail('Product delete', err instanceof Error ? err.message : String(err));
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n${'═'.repeat(60)}`);
  if (failures === 0) {
    console.log('  ✅  All checks passed — Google Vehicle Ads catalog sync is healthy');
    if (!skipDelete) console.log('  Products upserted and one removed from Merchant Center.');
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
