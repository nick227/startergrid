import { useState, useMemo } from 'react';
import type { AdminDashboardResponse, AdminBlockedDealersResponse } from '@/lib/api/admin.ts';
import type { DealershipRecordSummary } from '@/lib/api/dealershipRecordApi.ts';

type WorkFilter = 'all' | 'my' | 'onboarding' | 'blockers';

type Props = {
  dealers: DealershipRecordSummary[];
  blockedData: AdminBlockedDealersResponse | null;
  dashboardData: AdminDashboardResponse | null;
  currentUserEmail?: string;
  onSelectDealer: (dealerId: string, subTab?: string) => void;
  onResolveIssue?: (dealerId: string, issueKey: string) => void;
};

type WorkItem = {
  id: string;
  dealerId: string;
  dealerName: string;
  type: 'onboarding' | 'distribution' | 'credential' | 'data';
  title: string;
  detail: string;
  ownerKind: 'STAFF' | 'DEALERSHIP' | 'SYSTEM' | 'PARTNER';
  ownerName: string;
  isMyTask: boolean;
  severity: 'critical' | 'warning' | 'info';
  nextAction: string;
  targetSubTab: string;
  dueText: string;
};

export function AdminWorkTab({
  dealers,
  blockedData,
  dashboardData,
  currentUserEmail,
  onSelectDealer,
}: Props) {
  const [filter, setFilter] = useState<WorkFilter>('all');
  const [search, setSearch] = useState('');

  // Assemble prioritized work items from real dealer data & blocked accounts
  const workItems: WorkItem[] = useMemo(() => {
    const items: WorkItem[] = [];

    // 1. Onboarding tasks from dealerships in SETTING_UP or with nextStep
    dealers.forEach(d => {
      if (d.lifecycleStatus === 'SETTING_UP' || d.lifecycleStatus === 'DRAFT') {
        const isMy = d.internalOwner?.email === currentUserEmail || (!d.internalOwner && true);
        items.push({
          id: `onb-${d.id}`,
          dealerId: d.id,
          dealerName: d.legalName,
          type: 'onboarding',
          title: d.nextStep?.label || 'Complete dealership setup and launch verification',
          detail: `Onboarding progress: ${d.counts?.vehicles ?? 0} vehicles loaded · ${d.counts?.invitations ?? 0} invites active`,
          ownerKind: d.nextStep?.ownerKind === 'DEALER' ? 'DEALERSHIP' : 'STAFF',
          ownerName: d.internalOwner?.email || 'Unassigned (Our Team)',
          isMyTask: isMy,
          severity: 'warning',
          nextAction: 'Continue Onboarding Stepper',
          targetSubTab: 'setup',
          dueText: 'Due today',
        });
      }
    });

    // 2. Blockers and Distribution problems
    blockedData?.items?.forEach(b => {
      const isMy = false;
      items.push({
        id: `blk-${b.id}`,
        dealerId: b.dealerId,
        dealerName: b.dealerName,
        type: 'distribution',
        title: `${b.platformName}: ${b.reason}`,
        detail: `Platform issue (${b.source}): ${b.nextAction}`,
        ownerKind: 'STAFF',
        ownerName: 'Internal Support Team',
        isMyTask: isMy,
        severity: b.severity === 'critical' ? 'critical' : 'warning',
        nextAction: b.nextAction || 'Inspect Channel Exceptions',
        targetSubTab: 'channels',
        dueText: 'Immediate attention',
      });
    });

    // 3. Fallback items if zero issues
    if (items.length === 0 && dealers.length > 0) {
      const first = dealers[0];
      if (first) {
        items.push({
          id: `routine-${first.id}`,
          dealerId: first.id,
          dealerName: first.legalName,
          type: 'distribution',
          title: 'Routine readiness audit',
          detail: 'All automated channel dispatches are operating within normal parameters.',
          ownerKind: 'SYSTEM',
          ownerName: 'Autopilot Engine',
          isMyTask: false,
          severity: 'info',
          nextAction: 'View Channels',
          targetSubTab: 'channels',
          dueText: 'Continuous',
        });
      }
    }

    return items;
  }, [dealers, blockedData, dashboardData, currentUserEmail]);

  const filteredItems = useMemo(() => {
    let list = workItems;
    if (filter === 'my') list = list.filter(item => item.isMyTask);
    else if (filter === 'onboarding') list = list.filter(item => item.type === 'onboarding');
    else if (filter === 'blockers') list = list.filter(item => item.type === 'distribution');

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(item =>
        item.dealerName.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.ownerName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [workItems, filter, search]);

  const counts = {
    all: workItems.length,
    my: workItems.filter(i => i.isMyTask).length,
    onboarding: workItems.filter(i => i.type === 'onboarding').length,
    blockers: workItems.filter(i => i.type === 'distribution').length,
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Filter Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink-heading">Team Work Hub</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Prioritized onboarding tasks and distribution problems requiring action.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks, dealerships..."
            className="px-3 py-1.5 text-xs border border-silver-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-500 w-56 bg-white"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-silver-200 pb-2 overflow-x-auto">
        {[
          { id: 'all' as WorkFilter, label: 'All Open Tasks', count: counts.all },
          { id: 'my' as WorkFilter, label: 'My Assigned Work', count: counts.my },
          { id: 'onboarding' as WorkFilter, label: 'Onboarding & Launch', count: counts.onboarding },
          { id: 'blockers' as WorkFilter, label: 'Distribution Blockers', count: counts.blockers },
        ].map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              filter === f.id
                ? 'bg-navy-900 text-white shadow-sm'
                : 'bg-silver-100 text-ink-muted hover:text-ink-heading hover:bg-silver-200'
            }`}
          >
            <span>{f.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                filter === f.id ? 'bg-navy-800 text-silver-300' : 'bg-silver-200 text-ink-faint'
              }`}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Work Item List */}
      <div className="space-y-3">
        {filteredItems.map(item => (
          <div
            key={item.id}
            className="p-5 rounded-xl border border-silver-200 bg-white shadow-elevation-1 hover:shadow-elevation-2 transition-shadow"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      item.severity === 'critical'
                        ? 'bg-status-error-text'
                        : item.severity === 'warning'
                        ? 'bg-status-warning-text'
                        : 'bg-status-info-text'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => onSelectDealer(item.dealerId, item.targetSubTab)}
                    className="text-sm font-bold text-ink-heading hover:text-orange-600 hover:underline text-left"
                  >
                    {item.dealerName}
                  </button>
                  <span className="text-silver-300">·</span>
                  <span className="text-xs font-semibold text-ink-heading">{item.title}</span>
                </div>

                <p className="text-xs text-ink-muted">{item.detail}</p>

                {/* Ownership Line */}
                <div className="pt-2 flex items-center gap-3 text-xs text-ink-body flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <span className="text-ink-muted text-[11px]">Assigned Owner:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        item.ownerKind === 'STAFF'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : item.ownerKind === 'DEALERSHIP'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : item.ownerKind === 'SYSTEM'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-silver-100 text-ink-muted border-silver-300'
                      }`}
                    >
                      {item.ownerKind === 'STAFF' ? '👤 ' : item.ownerKind === 'DEALERSHIP' ? '🏢 ' : '⚙️ '}
                      {item.ownerName}
                    </span>
                  </span>

                  <span className="text-silver-300">·</span>
                  <span className="text-ink-faint text-[11px]">{item.dueText}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => onSelectDealer(item.dealerId, item.targetSubTab)}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-md bg-navy-900 text-white hover:bg-navy-800 shadow-sm"
                >
                  {item.nextAction} →
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="p-12 text-center bg-white rounded-xl border border-silver-200">
            <p className="text-sm font-semibold text-ink-heading">No work items matching this view</p>
            <p className="text-xs text-ink-muted mt-1">All onboarding and distribution tasks are up to date.</p>
          </div>
        )}
      </div>
    </div>
  );
}
