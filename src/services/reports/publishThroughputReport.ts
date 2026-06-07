import type { PrismaClient } from '@prisma/client';
import type { ReportTimeWindow } from './reportRange.js';
import { reportRangeWhere, toReportTimeWindowDto } from './reportRange.js';
import type { PublishThroughputChannelRow, PublishThroughputReport } from './reportTypes.js';

const OPEN_STATUSES = [
  'READY',
  'SCHEDULED',
  'NEEDS_APPROVAL',
  'BLOCKED',
  'HELD',
  'CLAIMED',
] as const;

const RETRY_KINDS = ['DISPATCH_RETRY'] as const;
const DISPATCH_FAIL_KINDS = ['DISPATCH_FAILED'] as const;

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function emptyChannel(slug: string): PublishThroughputChannelRow {
  return {
    channelSlug: slug,
    sentInPeriod: 0,
    failedInPeriod: 0,
    retryEventsInPeriod: 0,
    dispatchFailuresInPeriod: 0,
    openQueueCount: 0,
  };
}

export async function buildPublishThroughputReport(
  prisma: PrismaClient,
  dealershipId: string,
  window: ReportTimeWindow,
  now: Date = new Date(),
): Promise<PublishThroughputReport> {
  const range = reportRangeWhere(window);

  const [sentItems, failedItems, openItems, retryEvents, failEvents] = await Promise.all([
    prisma.publishQueueItem.findMany({
      where: { dealershipId, sentAt: range },
      select: { platformSlug: true, sentAt: true, createdAt: true },
    }),
    prisma.publishQueueItem.findMany({
      where: { dealershipId, status: 'FAILED', updatedAt: range },
      select: { platformSlug: true },
    }),
    prisma.publishQueueItem.findMany({
      where: {
        dealershipId,
        status: { in: [...OPEN_STATUSES] },
      },
      select: { platformSlug: true },
    }),
    prisma.syncEvent.findMany({
      where: {
        dealershipId,
        kind: { in: [...RETRY_KINDS] },
        createdAt: range,
      },
      select: { platformSlug: true },
    }),
    prisma.syncEvent.findMany({
      where: {
        dealershipId,
        kind: { in: [...DISPATCH_FAIL_KINDS] },
        createdAt: range,
      },
      select: { platformSlug: true },
    }),
  ]);

  const channelMap = new Map<string, PublishThroughputChannelRow>();

  const touch = (slug: string | null): PublishThroughputChannelRow => {
    const key = slug ?? '_global';
    const row = channelMap.get(key) ?? emptyChannel(key);
    channelMap.set(key, row);
    return row;
  };

  for (const item of sentItems) touch(item.platformSlug).sentInPeriod += 1;
  for (const item of failedItems) touch(item.platformSlug).failedInPeriod += 1;
  for (const item of openItems) touch(item.platformSlug).openQueueCount += 1;
  for (const ev of retryEvents) touch(ev.platformSlug).retryEventsInPeriod += 1;
  for (const ev of failEvents) touch(ev.platformSlug).dispatchFailuresInPeriod += 1;

  const hoursToSend = sentItems
    .filter(i => i.sentAt)
    .map(i => (i.sentAt!.getTime() - i.createdAt.getTime()) / (60 * 60 * 1000));

  const channels = [...channelMap.values()].sort(
    (a, b) =>
      b.failedInPeriod + b.openQueueCount - (a.failedInPeriod + a.openQueueCount)
      || a.channelSlug.localeCompare(b.channelSlug),
  );

  const sum = (pick: (r: PublishThroughputChannelRow) => number) =>
    channels.reduce((n, r) => n + pick(r), 0);

  return {
    meta: {
      dealershipId,
      generatedAt: now.toISOString(),
      range: toReportTimeWindowDto(window),
    },
    summary: {
      sentInPeriod: sum(r => r.sentInPeriod),
      failedInPeriod: sum(r => r.failedInPeriod),
      retryEventsInPeriod: sum(r => r.retryEventsInPeriod),
      dispatchFailuresInPeriod: sum(r => r.dispatchFailuresInPeriod),
      openQueueCount: sum(r => r.openQueueCount),
      medianHoursToSend: median(hoursToSend),
    },
    channels,
  };
}
