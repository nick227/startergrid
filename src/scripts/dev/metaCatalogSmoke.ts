/**
 * Meta Automotive Catalog smoke test.
 *
 * Verifies the full catalog sync lifecycle against the real Meta Marketing API.
 *
 * Prerequisites:
 *   - Meta OAuth connected (run smoke:meta-oauth first)
 *   - META_APP_ID / META_APP_SECRET set
 *   - At least one vehicle in the DB (or pass --vehicle-id=<id>)
 *   - Pass --catalog-id=<id> (from Facebook Commerce Manager → Catalog Settings)
 *
 * Usage:
 *   npm run smoke:meta-catalog -- --catalog-id=<id>
 *   npm run smoke:meta-catalog -- --catalog-id=<id> --dealer-id=<id>
 *   npm run smoke:meta-catalog -- --catalog-id=<id> --skip-delete
 */

import 'dotenv/config';
import { prisma } from '../../lib/prisma.js';
import { CredentialStore } from '../../services/platform/clients/CredentialStore.js';
import { MetaOAuthClient } from '../../services/platform/clients/providers/MetaOAuthClient.js';
import { MetaCatalogClient } from '../../services/catalog/MetaCatalogClient.js';
import { MetaCatalogBridge } from '../../services/catalog/bridges/MetaCatalogBridge.js';
import { CatalogSyncStore } from '../../services/catalog/CatalogSyncStore.js';
import { ContentPackageBuilder } from '../../services/distribution/ContentPackageBuilder.js';

const PLATFORM_SLUG = 'meta-automotive-ads';
const PROVIDER = 'meta-catalog-ads' as const;

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
  const skipDelete = hasFlag('skip-delete');

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  Meta Automotive Catalog Smoke Test');
  console.log('══════════════════════════════════════════════════════════');

  // ── Phase 1: Pre-flight ───────────────────────────────────────────────────

  section('PHASE 1 · Pre-flight');

  const catalogId = argValue('catalog-id');
  if (!catalogId) {
    fail('--catalog-id required');
    info('Find it in Facebook Commerce Manager → Catalog → Settings → Catalog ID');
    await prisma.$disconnect(); process.exit(1);
  }
  pass('--catalog-id', catalogId);

  const required: Record<string, string | undefined> = {
    META_APP_ID:     process.env['META_APP_ID'] ?? process.env['META_CLIENT_ID'],
    META_APP_SECRET: process.env['META_APP_SECRET'] ?? process.env['META_CLIENT_SECRET'],
  };
  let preflightOk = true;
  for (const [key, val] of Object.entries(required)) {
    if (val) pass(`${key} set`);
    else { fail(`${key} missing`); preflightOk = false; }
  }
  if (!preflightOk) {
    info('Fix missing env vars in .env and retry.');
    await prisma.$disconnect(); process.exit(1);
  }

  // ── Phase 2: Resolve dealer + vehicle ────────────────────────────────────

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

  const vehicles = await prisma.vehicle.findMany({
    where: { dealershipId: dealerId, removedAt: null, soldAt: null },
    include: { media: { select: { url: true, sortOrder: true } } },
    take: 3,
  });
  if (vehicles.length === 0) {
    fail('Vehicles found', 'no active vehicles — run npm run onboard:fake first');
    await prisma.$disconnect(); process.exit(1);
  }
  pass('Vehicles found', `${vehicles.length} active vehicles (will sync first 3)`);

  // ── Phase 3: OAuth token ──────────────────────────────────────────────────

  section('PHASE 3 · Verify OAuth token');

  const metaClient = new MetaOAuthClient();
  let token: string;
  try {
    token = await CredentialStore.withFreshToken(prisma, dealerId, PROVIDER, metaClient);
    pass('CredentialStore.withFreshToken succeeded', `${token.slice(0, 16)}…`);
  } catch (err: unknown) {
    fail('OAuth token available', err instanceof Error ? err.message : String(err));
    info('Run npm run smoke:meta-oauth first to connect Meta OAuth.');
    await prisma.$disconnect(); process.exit(1);
  }

  // ── Phase 4: Verify catalog access ───────────────────────────────────────

  section('PHASE 4 · Verify catalog access');

  try {
    const catalog = await MetaCatalogClient.getCatalog(token, catalogId);
    pass('Catalog accessible', `"${catalog.name}" (vertical=${catalog.vertical})`);
    assert(catalog.vertical === 'vehicles' || catalog.vertical === 'automotive',
      'Catalog vertical is automotive',
      `Catalog vertical is "${catalog.vertical}" — may not support automotive items`,
    );
  } catch (err: unknown) {
    fail('Catalog accessible', err instanceof Error ? err.message : String(err));
    info('Ensure the access token has catalog_management permission and catalog ID is correct.');
    await prisma.$disconnect(); process.exit(1);
  }

  // ── Phase 5: Upsert catalog items ─────────────────────────────────────────

  section('PHASE 5 · Upsert vehicles to catalog');

  const bridge = new MetaCatalogBridge();
  const ctx = { dealershipId: dealerId, listingBaseUrl: process.env['APP_BASE_URL'] ?? 'http://localhost:3000' };
  const items = vehicles.map(v => bridge.buildItem(ContentPackageBuilder.fromVehicle(v, ctx), ctx));

  info(`Syncing ${items.length} items: ${items.map(i => i.id).join(', ')}`);

  let handles: string[] | undefined;
  try {
    const result = await bridge.upsertItems(token, catalogId, items);
    pass('Items upserted', `accepted=${result.accepted}`);
    handles = result.handles;
    if (handles?.length) info(`Batch handles: ${handles.join(', ')}`);
  } catch (err: unknown) {
    fail('Items upsert', err instanceof Error ? err.message : String(err));
    await prisma.$disconnect(); process.exit(1);
  }

  // ── Phase 6: Store catalog config ─────────────────────────────────────────

  section('PHASE 6 · Store catalog config');

  try {
    const config = await CatalogSyncStore.upsertConfig(prisma, dealerId, PLATFORM_SLUG, catalogId);
    await CatalogSyncStore.markSynced(prisma, dealerId, PLATFORM_SLUG, vehicles.length);
    pass('Catalog config stored', `id=${config.id}`);
  } catch (err: unknown) {
    fail('Catalog config store', err instanceof Error ? err.message : String(err));
  }

  // ── Phase 7: Delete one item ──────────────────────────────────────────────

  if (skipDelete) {
    section('PHASE 7 · Delete item (skipped — --skip-delete)');
    info(`Items from this test are still in catalog ${catalogId}.`);
    info('Run again without --skip-delete to clean up, or remove manually in Commerce Manager.');
  } else {
    section('PHASE 7 · Delete one item from catalog');

    const deleteTarget = items[0].id;
    info(`Deleting itemId=${deleteTarget}`);
    try {
      await bridge.deleteItem(token, catalogId, deleteTarget);
      pass('Item deleted', `itemId=${deleteTarget}`);
    } catch (err: unknown) {
      fail('Item delete', err instanceof Error ? err.message : String(err));
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n${'═'.repeat(60)}`);
  if (failures === 0) {
    console.log('  ✅  All checks passed — Meta Automotive Catalog sync is healthy');
    if (!skipDelete) console.log('  Items upserted and one removed successfully.');
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
