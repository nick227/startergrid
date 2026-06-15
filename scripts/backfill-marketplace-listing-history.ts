import { prisma } from '../src/lib/prisma.js';
import { recordMarketplaceListingPublished } from '../src/services/publishing/historyEligibilityService.js';

const CONSUMER = 'consumer-marketplace';

async function main() {
  const listings = await prisma.marketplaceListing.findMany({
    where: { platformSlug: CONSUMER, status: 'ACTIVE', vehicleId: { not: null } },
    select: { dealershipId: true, vehicleId: true, listedAt: true, updatedAt: true },
  });

  let written = 0;
  for (const listing of listings) {
    const vehicleId = listing.vehicleId!;
    const existing = await prisma.syncEvent.findFirst({
      where: {
        dealershipId: listing.dealershipId,
        platformSlug: CONSUMER,
        vehicleId,
        kind: 'SUBMISSION_SENT',
      },
      select: { id: true },
    });
    if (existing) continue;
    await recordMarketplaceListingPublished(prisma, listing.dealershipId, CONSUMER, vehicleId);
    written++;
  }

  console.log(`Backfilled ${written} consumer-marketplace history event(s) from ${listings.length} active listing(s).`);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
