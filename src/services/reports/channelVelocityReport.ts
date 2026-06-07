import type { PrismaClient } from '@prisma/client';
import type { ReportTimeWindow } from './reportRange.js';
import { reportRangeWhere, toReportTimeWindowDto } from './reportRange.js';
import type { ChannelVelocityReport, ChannelVelocityRow } from './reportTypes.js';
import { daysBetween, median } from './reportMath.js';

function inRange(date: Date, range: { gte: Date; lt: Date }): boolean {
  return date >= range.gte && date < range.lt;
}

export async function buildChannelVelocityReport(
  prisma: PrismaClient,
  dealershipId: string,
  window: ReportTimeWindow,
  now: Date = new Date(),
): Promise<ChannelVelocityReport> {
  const range = reportRangeWhere(window);

  const vehicles = await prisma.vehicle.findMany({
    where: { dealershipId },
    select: { id: true, soldAt: true, removedAt: true },
  });

  const cohortIds = new Set<string>();
  const exitAt = new Map<string, Date>();
  const exitKind = new Map<string, 'sold' | 'removed'>();

  for (const v of vehicles) {
    if (v.soldAt && inRange(v.soldAt, range)) {
      cohortIds.add(v.id);
      exitAt.set(v.id, v.soldAt);
      exitKind.set(v.id, 'sold');
    } else if (v.removedAt && inRange(v.removedAt, range)) {
      cohortIds.add(v.id);
      exitAt.set(v.id, v.removedAt);
      exitKind.set(v.id, 'removed');
    }
  }

  if (!cohortIds.size) {
    return {
      meta: {
        dealershipId,
        generatedAt: now.toISOString(),
        range: toReportTimeWindowDto(window),
      },
      summary: { cohortOutcomeCount: 0, channelsWithOutcomes: 0 },
      channels: [],
    };
  }

  const submissions = await prisma.syncEvent.findMany({
    where: {
      dealershipId,
      kind: 'SUBMISSION_SENT',
      vehicleId: { in: [...cohortIds] },
    },
    select: { vehicleId: true, platformSlug: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const firstSubmit = new Map<string, Map<string, Date>>();
  for (const ev of submissions) {
    if (!ev.vehicleId || !ev.platformSlug) continue;
    const byChannel = firstSubmit.get(ev.platformSlug) ?? new Map<string, Date>();
    if (!byChannel.has(ev.vehicleId)) byChannel.set(ev.vehicleId, ev.createdAt);
    firstSubmit.set(ev.platformSlug, byChannel);
  }

  const channels: ChannelVelocityRow[] = [];

  for (const [channelSlug, byAsset] of [...firstSubmit.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const days: number[] = [];
    let soldOutcomes = 0;
    let removedOutcomes = 0;

    for (const [assetId, listedAt] of byAsset.entries()) {
      const end = exitAt.get(assetId);
      if (!end) continue;
      days.push(daysBetween(listedAt, end));
      if (exitKind.get(assetId) === 'sold') soldOutcomes += 1;
      else removedOutcomes += 1;
    }

    if (!days.length) continue;

    channels.push({
      channelSlug,
      observedOutcomeCount: days.length,
      soldOutcomes,
      removedOutcomes,
      medianDaysToOutcome: median(days),
    });
  }

  channels.sort(
    (a, b) =>
      (a.medianDaysToOutcome ?? Number.POSITIVE_INFINITY)
      - (b.medianDaysToOutcome ?? Number.POSITIVE_INFINITY)
      || b.observedOutcomeCount - a.observedOutcomeCount,
  );

  return {
    meta: {
      dealershipId,
      generatedAt: now.toISOString(),
      range: toReportTimeWindowDto(window),
    },
    summary: {
      cohortOutcomeCount: cohortIds.size,
      channelsWithOutcomes: channels.length,
    },
    channels,
  };
}
