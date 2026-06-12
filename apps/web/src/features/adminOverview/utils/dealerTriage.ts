import type { AdminDashboardResponse } from '@/lib/api/admin.ts';

export type DealerTriageCounts = {
  critical: number;
  warning: number;
  info: number;
};

export type DealerTriageMap = Record<string, DealerTriageCounts>;

export function buildDealerTriageMap(
  dealerAttention: AdminDashboardResponse['dealerAttention'],
): DealerTriageMap {
  const map: DealerTriageMap = {};
  for (const item of dealerAttention) {
    if (!map[item.dealerId]) map[item.dealerId] = { critical: 0, warning: 0, info: 0 };
    const severity = item.severity as keyof DealerTriageCounts;
    if (severity in map[item.dealerId]) map[item.dealerId][severity]++;
  }
  return map;
}

export function getDealerIssueWeight(triage: DealerTriageCounts | undefined): number {
  return triage ? triage.critical * 100 + triage.warning * 10 + triage.info : 0;
}
