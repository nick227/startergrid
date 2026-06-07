import type { PrismaClient } from '@prisma/client';
import type { ReportTimeWindow } from './reportRange.js';
import { reportRangeWhere, toReportTimeWindowDto } from './reportRange.js';
import type { SyncActivityChannelRow, SyncActivityKindRow, SyncActivityReport } from './reportTypes.js';

export async function buildSyncActivityReport(
  prisma: PrismaClient,
  dealershipId: string,
  window: ReportTimeWindow,
  now: Date = new Date(),
): Promise<SyncActivityReport> {
  const range = reportRangeWhere(window);

  const rows = await prisma.syncEvent.groupBy({
    by: ['platformSlug', 'kind'],
    where: { dealershipId, createdAt: range },
    _count: { _all: true },
  });

  const globalKind = new Map<string, number>();
  const channelKind = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const slug = row.platformSlug ?? '_none';
    const kind = row.kind;
    const count = row._count._all;

    globalKind.set(kind, (globalKind.get(kind) ?? 0) + count);

    const bucket = channelKind.get(slug) ?? new Map<string, number>();
    bucket.set(kind, (bucket.get(kind) ?? 0) + count);
    channelKind.set(slug, bucket);
  }

  const byKind: SyncActivityKindRow[] = [...globalKind.entries()]
    .map(([eventKind, count]) => ({ eventKind, count }))
    .sort((a, b) => b.count - a.count || a.eventKind.localeCompare(b.eventKind));

  const channels: SyncActivityChannelRow[] = [...channelKind.entries()]
    .map(([channelSlug, kinds]) => {
      const byKindRows = [...kinds.entries()]
        .map(([eventKind, count]) => ({ eventKind, count }))
        .sort((a, b) => b.count - a.count || a.eventKind.localeCompare(b.eventKind));
      return {
        channelSlug,
        totalEvents: byKindRows.reduce((n, k) => n + k.count, 0),
        byKind: byKindRows,
      };
    })
    .sort((a, b) => b.totalEvents - a.totalEvents || a.channelSlug.localeCompare(b.channelSlug));

  return {
    meta: {
      dealershipId,
      generatedAt: now.toISOString(),
      range: toReportTimeWindowDto(window),
    },
    summary: {
      totalEvents: byKind.reduce((n, k) => n + k.count, 0),
    },
    byKind,
    channels,
  };
}
