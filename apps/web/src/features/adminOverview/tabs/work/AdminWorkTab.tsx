import { useMemo, useState } from 'react';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchBlockedDealers } from '@/lib/api/admin.ts';
import { fetchAdminDealerships } from '@/lib/api/dealershipRecordApi.ts';
import { OwnershipLine } from '@/components/guidance/OwnershipLine.tsx';
import { GuidanceNote } from '@/components/guidance/GuidanceNote.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { buildWorkItems } from './buildWorkItems.ts';

type Filter = 'mine' | 'all' | 'setup' | 'blockers';

type Props = {
  currentUserEmail?: string;
  onSelectDealer: (dealerId: string, subTab?: string) => void;
};

export function AdminWorkTab({ currentUserEmail, onSelectDealer }: Props) {
  const [filter, setFilter] = useState<Filter>('mine');
  const dealers = useAsyncQuery(() => fetchAdminDealerships({ needsAttention: true, limit: 100 }), []);
  const blocked = useAsyncQuery(() => fetchBlockedDealers({ limit: 50 }), []);

  const items = useMemo(
    () => buildWorkItems(dealers.data?.dealerships ?? [], blocked.data, currentUserEmail),
    [dealers.data, blocked.data, currentUserEmail],
  );

  const visible = items.filter((item) => {
    if (filter === 'mine') return item.isMine;
    if (filter === 'setup') return item.type === 'onboarding';
    if (filter === 'blockers') return item.type === 'blocker';
    return true;
  });

  if (dealers.loading) {
    return <div className="surface-card-operator p-6 rounded-xl"><Skeleton rows={6} /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-ink-heading">Work</h2>
        <GuidanceNote>One list. Each row has an owner and a next action.</GuidanceNote>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ['mine', 'My work'],
          ['all', 'Team'],
          ['setup', 'Setup'],
          ['blockers', 'Blockers'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              filter === id ? 'bg-navy-900 text-white' : 'bg-silver-100 text-ink-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="surface-card-operator p-8 rounded-xl border border-silver-200 bg-white">
          <p className="text-sm font-medium text-ink-heading">No open work in this view</p>
          <GuidanceNote>Setup and channel exceptions appear here when they need a person.</GuidanceNote>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <li key={item.id} className="surface-card-operator p-4 rounded-xl border border-silver-200 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelectDealer(item.dealerId, item.targetSubTab)}
                    className="text-sm font-semibold text-ink-heading underline-offset-2 hover:underline"
                  >
                    {item.dealerName}
                  </button>
                  <OwnershipLine
                    action={item.action}
                    ownerKind={item.ownerKind}
                    ownerName={item.ownerName}
                    due={item.due}
                  />
                  <GuidanceNote>{item.detail}</GuidanceNote>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectDealer(item.dealerId, item.targetSubTab)}
                  className="btn-primary-operator text-xs shrink-0"
                >
                  Open
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
