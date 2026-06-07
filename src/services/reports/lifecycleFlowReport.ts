import type { PrismaClient } from '@prisma/client';
import type { ReportTimeWindow } from './reportRange.js';
import { reportRangeWhere, toReportTimeWindowDto } from './reportRange.js';
import type { LifecycleFlowReport, LifecycleTransitionRow } from './reportTypes.js';

const TRANSITION_STATES = ['SOLD', 'REMOVED', 'REACTIVATED'] as const;

export async function buildLifecycleFlowReport(
  prisma: PrismaClient,
  dealershipId: string,
  window: ReportTimeWindow,
  now: Date = new Date(),
): Promise<LifecycleFlowReport> {
  const range = reportRangeWhere(window);

  const [intakeCount, events] = await Promise.all([
    prisma.vehicle.count({
      where: { dealershipId, createdAt: range },
    }),
    prisma.vehicleLifecycleEvent.findMany({
      where: { dealershipId, statusChangedAt: range },
      select: { toState: true },
    }),
  ]);

  const counts = new Map<string, number>();
  for (const state of TRANSITION_STATES) counts.set(state, 0);
  for (const ev of events) {
    counts.set(ev.toState, (counts.get(ev.toState) ?? 0) + 1);
  }

  const soldExits = counts.get('SOLD') ?? 0;
  const removedExits = counts.get('REMOVED') ?? 0;
  const reactivatedCount = counts.get('REACTIVATED') ?? 0;

  const transitions: LifecycleTransitionRow[] = [...counts.entries()]
    .filter(([, count]) => count > 0)
    .map(([transitionState, count]) => ({ transitionState, count }))
    .sort((a, b) => b.count - a.count || a.transitionState.localeCompare(b.transitionState));

  return {
    meta: {
      dealershipId,
      generatedAt: now.toISOString(),
      range: toReportTimeWindowDto(window),
    },
    summary: {
      intakeCount,
      soldExits,
      removedExits,
      reactivatedCount,
      netChange: intakeCount - soldExits - removedExits + reactivatedCount,
    },
    transitions,
  };
}
