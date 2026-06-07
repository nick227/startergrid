import type { PrismaClient } from '@prisma/client';
import type { ReportTimeWindow } from './reportRange.js';
import { reportRangeWhere, toReportTimeWindowDto } from './reportRange.js';
import type { MerchandisingActivityReport, MerchandisingAssetRow } from './reportTypes.js';

const MERCH_KINDS = ['PRICE_CHANGE', 'PHOTO_CHANGE', 'DETAILS_CHANGE'] as const;

export async function buildMerchandisingActivityReport(
  prisma: PrismaClient,
  dealershipId: string,
  window: ReportTimeWindow,
  now: Date = new Date(),
): Promise<MerchandisingActivityReport> {
  const range = reportRangeWhere(window);

  const [updates, activeAssets] = await Promise.all([
    prisma.vehicleUpdate.findMany({
      where: {
        dealershipId,
        createdAt: range,
        kind: { in: [...MERCH_KINDS] },
      },
      select: { vehicleId: true, kind: true },
    }),
    prisma.vehicle.findMany({
      where: { dealershipId, soldAt: null, removedAt: null },
      select: { id: true, stockNumber: true },
    }),
  ]);

  const refById = new Map(activeAssets.map(a => [a.id, a.stockNumber]));
  const buckets = new Map<string, MerchandisingAssetRow>();

  const touch = (assetId: string): MerchandisingAssetRow => {
    const row = buckets.get(assetId) ?? {
      assetId,
      assetRef: refById.get(assetId) ?? assetId,
      updateCount: 0,
      byKind: [],
    };
    buckets.set(assetId, row);
    return row;
  };

  for (const update of updates) {
    const row = touch(update.vehicleId);
    row.updateCount += 1;
    const kindRow = row.byKind.find(k => k.updateKind === update.kind);
    if (kindRow) kindRow.count += 1;
    else row.byKind.push({ updateKind: update.kind, count: 1 });
  }

  const touched = new Set(updates.map(u => u.vehicleId));
  const activeAssetsNeglected = activeAssets.filter(a => !touched.has(a.id)).length;

  const assets = [...buckets.values()]
    .map(row => ({
      ...row,
      byKind: [...row.byKind].sort((a, b) => b.count - a.count || a.updateKind.localeCompare(b.updateKind)),
    }))
    .sort((a, b) => b.updateCount - a.updateCount || a.assetRef.localeCompare(b.assetRef));

  return {
    meta: {
      dealershipId,
      generatedAt: now.toISOString(),
      range: toReportTimeWindowDto(window),
    },
    summary: {
      assetsWithActivity: assets.length,
      totalUpdates: updates.length,
      activeAssetsNeglected,
    },
    assets,
  };
}
