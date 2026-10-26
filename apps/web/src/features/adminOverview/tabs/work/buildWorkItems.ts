import type { AdminBlockedDealersResponse } from '@/lib/api/admin.ts';
import type { DealershipRecordSummary } from '@/lib/api/dealershipRecordApi.ts';

export type WorkItem = {
  id: string;
  dealerId: string;
  dealerName: string;
  type: 'onboarding' | 'blocker';
  action: string;
  detail: string;
  ownerKind: string;
  ownerName: string | null;
  isMine: boolean;
  due: string;
  targetSubTab: string;
};

export function buildWorkItems(
  dealers: DealershipRecordSummary[],
  blocked: AdminBlockedDealersResponse | null,
  currentUserEmail?: string,
): WorkItem[] {
  const items: WorkItem[] = dealers.flatMap((dealer) => {
    if (!dealer.nextStep && dealer.lifecycleStatus === 'ACTIVE') return [];
    const ownerKind = dealer.nextStep?.ownerKind ?? 'OUR_TEAM';
    return [{
      id: `setup-${dealer.id}`,
      dealerId: dealer.id,
      dealerName: dealer.legalName,
      type: 'onboarding' as const,
      action: dealer.nextStep?.nextAction || dealer.nextStep?.label || 'Continue setup',
      detail: dealer.lifecycleStatus === 'ACTIVE' ? 'Needs a recheck.' : dealer.lifecycleStatus.replace(/_/g, ' ').toLowerCase(),
      ownerKind,
      ownerName: dealer.nextStep?.ownerName ?? dealer.internalOwner?.email ?? null,
      isMine: Boolean(currentUserEmail && dealer.internalOwner?.email === currentUserEmail),
      due: 'due today',
      targetSubTab: 'setup',
    }];
  });

  for (const row of blocked?.items ?? []) {
    items.push({
      id: `block-${row.id}`,
      dealerId: row.dealerId,
      dealerName: row.dealerName,
      type: 'blocker',
      action: row.nextAction || row.reason,
      detail: row.platformName,
      ownerKind: 'OUR_TEAM',
      ownerName: null,
      isMine: false,
      due: row.severity === 'critical' ? 'now' : 'today',
      targetSubTab: 'channels',
    });
  }

  return items;
}
