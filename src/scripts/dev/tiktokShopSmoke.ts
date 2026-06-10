/**
 * TikTok Shop catalog sync smoke test.
 *
 * Usage:
 *   npm run smoke:tiktok-shop -- --shop-id 7300000000000000001 --dealer-id <id>
 *
 * Required env:
 *   DATABASE_URL, TIKTOK_SHOP_APP_KEY, TIKTOK_SHOP_APP_SECRET
 *
 * Optional env:
 *   TIKTOK_SHOP_ACCESS_TOKEN  (skips OAuth token lookup — use for quick testing)
 */

import { PrismaClient } from '@prisma/client';
import { TikTokShopClient } from '../../services/catalog/TikTokShopClient.js';
import { TikTokShopBridge } from '../../services/catalog/bridges/TikTokShopBridge.js';
import { TikTokShopOAuthClient } from '../../services/platform/clients/providers/TikTokShopOAuthClient.js';
import { CredentialStore } from '../../services/platform/clients/CredentialStore.js';
import { CatalogSyncStore } from '../../services/catalog/CatalogSyncStore.js';
import { ContentPackageBuilder } from '../../services/distribution/ContentPackageBuilder.js';

const args = process.argv.slice(2);
const shopId = args[args.indexOf('--shop-id') + 1];
const dealerId = args[args.indexOf('--dealer-id') + 1];

if (!shopId || !dealerId) {
  console.error('Usage: npm run smoke:tiktok-shop -- --shop-id <shopId> --dealer-id <id>');
  process.exit(1);
}

const APP_BASE_URL = process.env['APP_BASE_URL'] ?? 'http://localhost:3000';
const prisma = new PrismaClient();

async function main() {
  console.log('\n── Phase 1: Pre-flight ──────────────────────────────────');
  for (const v of ['DATABASE_URL', 'TIKTOK_SHOP_APP_KEY', 'TIKTOK_SHOP_APP_SECRET']) {
    if (!process.env[v]) { console.error(`Missing env: ${v}`); process.exit(1); }
  }
  console.log('  dealer:', dealerId);
  console.log('  shop ID:', shopId);

  console.log('\n── Phase 2: Dealer vehicles ─────────────────────────────');
  const vehicles = await prisma.vehicle.findMany({
    where: { dealershipId: dealerId, removedAt: null, soldAt: null },
    include: { media: { select: { url: true, sortOrder: true } } },
    take: 3,
  });
  console.log(`  Found ${vehicles.length} vehicles (showing up to 3)`);
  if (!vehicles.length) { console.warn('  No vehicles — catalog sync will push 0 items.'); }

  console.log('\n── Phase 3: OAuth token ─────────────────────────────────');
  let token: string;
  const envToken = process.env['TIKTOK_SHOP_ACCESS_TOKEN'];
  if (envToken) {
    token = envToken;
    console.log('  Using TIKTOK_SHOP_ACCESS_TOKEN from env');
  } else {
    const oauthClient = new TikTokShopOAuthClient();
    token = await CredentialStore.withFreshToken(prisma, dealerId, 'tiktok-shop', oauthClient);
    console.log('  Retrieved token from CredentialStore');
  }

  console.log('\n── Phase 4: Shop info preflight ─────────────────────────');
  const shopInfo = await TikTokShopClient.getShop(token);
  const shops = shopInfo.data?.shops ?? [];
  console.log(`  getShop returned ${shops.length} shop(s)`);
  shops.forEach(s => console.log(`    - ${s.name} (${s.id}) region=${s.region}`));

  console.log('\n── Phase 5: Upsert vehicles ─────────────────────────────');
  const bridge = new TikTokShopBridge();
  const ctx = { dealershipId: dealerId, listingBaseUrl: APP_BASE_URL };
  const items = vehicles.map(v => bridge.buildItem(ContentPackageBuilder.fromVehicle(v, ctx), ctx));
  console.log(`  Building ${items.length} product(s) for upsert`);

  const result = await bridge.upsertItems(token, shopId, items);
  console.log(`  Accepted: ${result.accepted}, Rejected: ${result.rejected}`);
  if (result.rejectedItems?.length) {
    result.rejectedItems.forEach(r => console.warn(`    Rejected ${r.itemId}: ${r.errors.join(', ')}`));
  }

  console.log('\n── Phase 6: Store catalog config ────────────────────────');
  await CatalogSyncStore.upsertConfig(prisma, dealerId, 'tiktok-shop', shopId);
  await CatalogSyncStore.markSynced(prisma, dealerId, 'tiktok-shop', vehicles.length);
  console.log('  Config stored, sync count updated');

  console.log('\n── Phase 7: Delete first vehicle (if any) ───────────────');
  if (vehicles[0]) {
    const sn = vehicles[0].stockNumber;
    console.log(`  Deleting ${sn} (search by seller_sku then delete by product_id)...`);
    await bridge.deleteItem(token, shopId, sn);
    console.log(`  Delete OK for ${sn}`);
  } else {
    console.log('  Skipped — no vehicles to delete');
  }

  console.log('\n✓ TikTok Shop smoke test passed\n');
}

main()
  .catch(err => { console.error('\nSmoke test FAILED:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
