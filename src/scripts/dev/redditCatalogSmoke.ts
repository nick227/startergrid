/**
 * Reddit Dynamic Product Ads catalog smoke test.
 *
 * Prerequisites:
 *   - Reddit OAuth connected (run smoke:reddit-oauth first)
 *   - REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET set
 *   - --catalog-id=<id>  (Reddit catalog ID from Reddit Ads Manager → Assets → Catalogs)
 *   - At least one vehicle in the DB
 *
 * Usage:
 *   npm run smoke:reddit-catalog -- --catalog-id=<id>
 *   npm run smoke:reddit-catalog -- --catalog-id=<id> --dealer-id=<id>
 *   npm run smoke:reddit-catalog -- --catalog-id=<id> --skip-delete
 */

import 'dotenv/config';
import { prisma } from '../../lib/prisma.js';
import { CredentialStore } from '../../services/platform/clients/CredentialStore.js';
import { RedditOAuthClient } from '../../services/platform/clients/providers/RedditOAuthClient.js';
import { RedditCatalogBridge } from '../../services/catalog/bridges/RedditCatalogBridge.js';
import { CatalogSyncStore } from '../../services/catalog/CatalogSyncStore.js';
import { ContentPackageBuilder } from '../../services/distribution/ContentPackageBuilder.js';

const PLATFORM_SLUG = 'reddit-dynamic-product-ads';
const PROVIDER = 'reddit' as const;

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
  console.log('  Reddit Dynamic Product Ads Catalog Smoke Test');
  console.log('══════════════════════════════════════════════════════════');

  // ── Phase 1: Pre-flight ───────────────────────────────────────────────────

  section('PHASE 1 · Pre-flight');

  const catalogId = argValue('catalog-id');
  if (!catalogId) {
    fail('--catalog-id required', 'Find it in Reddit Ads Manager → Assets → Catalogs');
    await prisma.$disconnect(); process.exit(1);
  }
  pass('--catalog-id', catalogId);

  const required: Record<string, string | undefined> = {
    REDDIT_CLIENT_ID:     process.env['REDDIT_CLIENT_ID'],
    REDDIT_CLIENT_SECRET: process.env['REDDIT_CLIENT_SECRET'],
  };
  let preflightOk = true;
  for (const [key, val] of Object.entries(required)) {
    if (val) pass(`${key} set`); else { fail(`${key} missing`); preflightOk = false; }
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

  const redditClient = new RedditOAuthClient();
  let token: string;
  try {
    token = await CredentialStore.withFreshToken(prisma, dealerId, PROVIDER, redditClient);
    pass('CredentialStore.withFreshToken succeeded', `${token.slice(0, 16)}…`);
  } catch (err: unknown) {
    fail('OAuth token available', err instanceof Error ? err.message : String(err));
    info('Run npm run smoke:reddit-oauth first to connect Reddit OAuth.');
    await prisma.$disconnect(); process.exit(1);
  }

  // ── Phase 4: Upsert vehicles ──────────────────────────────────────────────

  section('PHASE 4 · Upsert vehicles to Reddit catalog');

  const bridge = new RedditCatalogBridge();
  const ctx = { dealershipId: dealerId, listingBaseUrl: process.env['APP_BASE_URL'] ?? 'http://localhost:3000' };
  const items = vehicles.map(v => bridge.buildItem(ContentPackageBuilder.fromVehicle(v, ctx), ctx));

  info(`Syncing ${items.length} item(s): ${items.map(i => i.id).join(', ')}`);

  let syncResult: { accepted: number; rejected: number; handles?: string[]; rejectedItems?: Array<{ itemId: string; errors: string[] }> };
  try {
    syncResult = await bridge.upsertItems(token, catalogId, items);
    assert(syncResult.accepted === items.length, 'All items accepted', `${syncResult.rejected} item(s) rejected`);
    if (syncResult.handles?.length) info(`  Batch ID: ${syncResult.handles[0]}`);
    if (syncResult.rejectedItems?.length) {
      syncResult.rejectedItems.forEach(r => info(`  Rejected itemId=${r.itemId}: ${r.errors.join(', ')}`));
    }
  } catch (err: unknown) {
    fail('Items upsert', err instanceof Error ? err.message : String(err));
    await prisma.$disconnect(); process.exit(1);
  }

  // ── Phase 5: Store catalog config ─────────────────────────────────────────

  section('PHASE 5 · Store catalog config');

  try {
    const config = await CatalogSyncStore.upsertConfig(prisma, dealerId, PLATFORM_SLUG, catalogId);
    await CatalogSyncStore.markSynced(prisma, dealerId, PLATFORM_SLUG, vehicles.length);
    pass('Catalog config stored', `id=${config.id}`);
  } catch (err: unknown) {
    fail('Catalog config store', err instanceof Error ? err.message : String(err));
  }

  // ── Phase 6: Delete one item ──────────────────────────────────────────────

  if (skipDelete) {
    section('PHASE 6 · Delete item (skipped — --skip-delete)');
    info(`Products from this test remain in Reddit catalog ${catalogId}.`);
  } else {
    section('PHASE 6 · Delete one product from Reddit catalog');

    const deleteTarget = items[0].id;
    info(`Deleting product itemId=${deleteTarget}`);
    try {
      await bridge.deleteItem(token, catalogId, deleteTarget);
      pass('Product deleted', `itemId=${deleteTarget}`);
    } catch (err: unknown) {
      fail('Product delete', err instanceof Error ? err.message : String(err));
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n${'═'.repeat(60)}`);
  if (failures === 0) {
    console.log('  ✅  All checks passed — Reddit Dynamic Product Ads catalog sync is healthy');
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
