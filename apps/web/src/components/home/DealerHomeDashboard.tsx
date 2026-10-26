import { useEffect, useMemo, useState } from 'react';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import {
  fetchDealershipProfile,
  fetchPublishStatus,
  fetchDealerLeads,
  type DealerLead,
} from '@/lib/api/sdk.ts';
import type { DealershipProfile, PublishStatusResponse } from '@/lib/types.ts';
import { OwnershipLine } from '@/components/guidance/OwnershipLine.tsx';
import { GuidanceNote } from '@/components/guidance/GuidanceNote.tsx';
import { DealershipAutopilot } from '@/components/guidance/DealershipAutopilot.tsx';
import { GettingStartedChecklist } from './GettingStartedChecklist.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';

type Props = { dealerId: string; nav: OperatorNavHandlers };

type HomeTask = {
  id: string;
  action: string;
  detail: string;
  ownerKind: 'YOU' | 'OUR_TEAM';
  button: string;
  onAction: () => void;
};

function platformIsConnected(platform: PublishStatusResponse['platforms'][number]): boolean {
  return platform.accountState === 'ACTIVE' || platform.state === 'Active' || platform.state === 'Ready' || platform.state === 'Scheduled';
}

export function DealerHomeDashboard({ dealerId, nav }: Props) {
  const [profile, setProfile] = useState<DealershipProfile | null>(null);
  const [status, setStatus] = useState<PublishStatusResponse | null>(null);
  const [leads, setLeads] = useState<DealerLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    Promise.all([
      fetchDealershipProfile(dealerId).catch(() => null),
      fetchPublishStatus(dealerId).catch(() => null),
      fetchDealerLeads(dealerId, { limit: 5 }).catch(() => ({ leads: [] })),
    ]).then(([nextProfile, nextStatus, leadRes]) => {
      if (!live) return;
      setProfile(nextProfile);
      setStatus(nextStatus);
      setLeads(leadRes?.leads ?? []);
      setLoading(false);
    }).catch(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [dealerId]);

  const newLeads = leads.filter(lead => !lead.workflowStatus || lead.workflowStatus === 'NEW');
  const blocked = status?.vehicles?.blocked ?? 0;
  const connectedCount = (status?.platforms ?? []).filter(platformIsConnected).length;

  const lastCheckTime = status?.autoSync?.lastCompletedAt
    ? new Date(status.autoSync.lastCompletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : status?.preparedAt
    ? new Date(status.preparedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const tasks = useMemo<HomeTask[]>(() => {
    const list: HomeTask[] = [];
    profile?.publishingWarnings?.filter(w => w.severity === 'critical').forEach((warning, index) => {
      list.push({
        id: `profile-${index}`,
        action: `Add ${warning.label || warning.field}`,
        detail: warning.message,
        ownerKind: 'YOU',
        button: 'Open settings',
        onAction: nav.goToSettings,
      });
    });
    if (blocked > 0) {
      list.push({
        id: 'vehicles',
        action: `Fix ${blocked} vehicle${blocked === 1 ? '' : 's'} that cannot list`,
        detail: 'Usually a missing price or photos.',
        ownerKind: 'YOU',
        button: 'Review vehicles',
        onAction: () => nav.goToInventory(),
      });
    }
    (status?.platforms ?? []).forEach(platform => {
      if (platform.accountState === 'ERROR') {
        list.push({
          id: platform.platformSlug,
          action: `Reconnect ${platform.platformName}`,
          detail: 'This channel stopped accepting updates.',
          ownerKind: 'YOU',
          button: 'Open channels',
          onAction: nav.goToPlatforms,
        });
      }
    });
    return list;
  }, [profile, status, nav, blocked]);

  if (loading) {
    return <div className="surface-card-operator p-6 rounded-xl"><Skeleton rows={6} /></div>;
  }

  return (
    <div className="space-y-5">
      <GettingStartedChecklist dealerId={dealerId} nav={nav} />

      <DealershipAutopilot
        dealerId={dealerId}
        preference={profile?.autopilotPreference ?? 'OFF'}
        connectedChannelCount={connectedCount}
        onUpdated={(preference) => {
          if (profile) setProfile({ ...profile, autopilotPreference: preference });
        }}
      />

      {/* Reliable Home Health Summary (P0.4) */}
      <section className="surface-card-operator p-5 rounded-xl border border-silver-200 bg-white space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                (profile?.autopilotPreference ?? 'OFF') === 'ON' && connectedCount > 0
                  ? 'bg-status-success-text ring-4 ring-status-success-bg'
                  : (profile?.autopilotPreference ?? 'OFF') === 'PAUSED'
                  ? 'bg-amber-500 ring-4 ring-amber-100'
                  : 'bg-silver-400'
              }`}
            />
            <h3 className="text-xs font-bold text-ink-heading uppercase tracking-wider">
              Distribution Health & Status
            </h3>
          </div>
          <span className="text-[11px] text-ink-muted">
            Last check: <strong>{lastCheckTime || 'recently'}</strong>
          </span>
        </div>

        <p className="text-sm text-ink-heading font-medium leading-relaxed">
          {(profile?.autopilotPreference ?? 'OFF') === 'ON'
            ? connectedCount === 0
              ? 'Autopilot is active, but no channels are currently connected. Connect a destination channel to begin syndication.'
              : `Autopilot is running. ${status?.vehicles.ready ?? 0} vehicle${(status?.vehicles.ready ?? 0) === 1 ? '' : 's'} submitted across ${connectedCount} connected channel${connectedCount === 1 ? '' : 's'}.${blocked > 0 ? ` ${blocked} need attention.` : ' All vehicles qualified.'}`
            : (profile?.autopilotPreference ?? 'OFF') === 'PAUSED'
            ? `Autopilot is paused. ${status?.vehicles.ready ?? 0} vehicle${(status?.vehicles.ready ?? 0) === 1 ? '' : 's'} staged on lot. Distribution is held until Autopilot is resumed.`
            : `Autopilot is off. Manual syndication only. ${status?.vehicles.ready ?? 0} vehicle${(status?.vehicles.ready ?? 0) === 1 ? '' : 's'} ready on lot.`
          }
        </p>

        <div className="pt-2 border-t border-silver-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-ink-muted">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-ink-heading">Connected ≠ Live:</span>
            <span>Vehicles are delivered via catalog feeds. Marketplace ingestion verification occurs on each destination platform.</span>
          </div>
          <button
            type="button"
            onClick={nav.goToPlatforms}
            className="text-navy-700 hover:text-navy-900 font-semibold underline shrink-0"
          >
            Inspect channels →
          </button>
        </div>
      </section>

      <section className="surface-card-operator p-5 rounded-xl border border-silver-200 bg-white space-y-3">
        <h3 className="text-sm font-semibold text-ink-heading">Needs attention</h3>
        {tasks.length === 0 ? (
          <GuidanceNote>Nothing needs you right now. New buyer inquiries appear below.</GuidanceNote>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="py-3 border-t border-silver-100 first:border-0 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <OwnershipLine action={task.action} ownerKind={task.ownerKind} due="today" />
                <GuidanceNote>{task.detail}</GuidanceNote>
              </div>
              <button type="button" onClick={task.onAction} className="btn-primary-operator text-xs shrink-0">
                {task.button}
              </button>
            </div>
          ))
        )}
      </section>

      <section className="surface-card-operator p-5 rounded-xl border border-silver-200 bg-white space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink-heading">New inquiries</h3>
          <button type="button" onClick={nav.goToLeads} className="text-xs font-medium text-ink-heading underline">
            Open leads
          </button>
        </div>
        {newLeads.length === 0 ? (
          <GuidanceNote>No new inquiries. Statuses are shared with your team.</GuidanceNote>
        ) : (
          newLeads.slice(0, 4).map(lead => (
            <button
              key={lead.id}
              type="button"
              onClick={nav.goToLeads}
              className="w-full text-left py-2 border-t border-silver-100 first:border-0 first:pt-0"
            >
              <p className="text-sm font-medium text-ink-heading">{lead.contactName || 'Buyer'}</p>
              <p className="text-xs text-ink-muted">
                {lead.vehicle ? `${lead.vehicle.year} ${lead.vehicle.make} ${lead.vehicle.model}` : 'Inventory inquiry'}
              </p>
            </button>
          ))
        )}
      </section>
    </div>
  );
}
