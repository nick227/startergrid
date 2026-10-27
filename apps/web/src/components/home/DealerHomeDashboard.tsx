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
import { PagePrimaryState } from '@/components/guidance/PagePrimaryState.tsx';
import { GettingStartedChecklist } from './GettingStartedChecklist.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { dealerSetupIncomplete, platformLooksConnected } from '@/lib/pagePrimaryState.ts';
import { fetchSyndicationSentryAudit, type SyndicationSentryAuditResult } from '@/lib/api/sentryApi.ts';

type Props = { dealerId: string; nav: OperatorNavHandlers };

type HomeTask = {
  id: string;
  action: string;
  detail: string;
  ownerKind: 'YOU' | 'OUR_TEAM';
  button: string;
  onAction: () => void;
};

export function DealerHomeDashboard({ dealerId, nav }: Props) {
  const [profile, setProfile] = useState<DealershipProfile | null>(null);
  const [status, setStatus] = useState<PublishStatusResponse | null>(null);
  const [leads, setLeads] = useState<DealerLead[]>([]);
  const [sentryAudit, setSentryAudit] = useState<SyndicationSentryAuditResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    Promise.all([
      fetchDealershipProfile(dealerId).catch(() => null),
      fetchPublishStatus(dealerId).catch(() => null),
      fetchDealerLeads(dealerId, { limit: 5 }).catch(() => ({ leads: [] })),
      fetchSyndicationSentryAudit(dealerId).catch(() => null),
    ]).then(([nextProfile, nextStatus, leadRes, nextSentry]) => {
      if (!live) return;
      setProfile(nextProfile);
      setStatus(nextStatus);
      setLeads(leadRes?.leads ?? []);
      setSentryAudit(nextSentry);
      setLoading(false);
    }).catch(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [dealerId]);

  const newLeads = leads.filter(lead => !lead.workflowStatus || lead.workflowStatus === 'NEW');
  const blocked = status?.vehicles?.blocked ?? 0;
  const connectedCount = (status?.platforms ?? []).filter(platformLooksConnected).length;
  const firstTime = Boolean(profile && status && dealerSetupIncomplete({
    vehicleTotal: status.vehicles.total,
    vehicleReady: status.vehicles.ready,
    channelConnected: connectedCount > 0,
    missingPrimaryContact: profile.publishingWarnings.some(w => w.field === 'primaryContactEmail'),
  }));

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
    const ghostCount = sentryAudit?.activeGhostListingsCount ?? 0;
    if (sentryAudit?.status === 'GHOST_LISTINGS_DETECTED' && ghostCount > 0) {
      list.push({
        id: 'sold-still-listed',
        action: `${ghostCount} sold vehicle${ghostCount === 1 ? '' : 's'} may still be listed`,
        detail: 'Take them down so shoppers do not call about a vehicle that left the lot.',
        ownerKind: 'YOU',
        button: 'Open channels',
        onAction: nav.goToPlatforms,
      });
    }
    return list;
  }, [profile, status, nav, blocked, sentryAudit]);

  if (loading) {
    return <div className="surface-card-operator p-6 rounded-xl"><Skeleton rows={6} /></div>;
  }

  if (firstTime) {
    return (
      <div className="space-y-5">
        <GettingStartedChecklist dealerId={dealerId} nav={nav} profile={profile} status={status} />
      </div>
    );
  }

  const top = tasks[0];
  const more = tasks.slice(1);
  const inquiryCount = newLeads.length;

  return (
    <div className="space-y-5">
      <PagePrimaryState
        kind={top ? 'attention' : 'running'}
        title={
          top
            ? top.action
            : inquiryCount > 0
              ? `${inquiryCount} new inquir${inquiryCount === 1 ? 'y' : 'ies'}`
              : "You're caught up"
        }
        why={
          top
            ? top.detail
            : inquiryCount > 0
              ? 'A shopper asked about a vehicle. Mark the next step so your team sees it.'
              : 'Nothing needs you right now. New buyer inquiries appear below.'
        }
        ownerKind={top ? top.ownerKind : inquiryCount > 0 ? 'YOU' : undefined}
        actionLabel={top ? top.button : inquiryCount > 0 ? 'Open leads' : undefined}
        onAction={top ? top.onAction : inquiryCount > 0 ? nav.goToLeads : undefined}
      />

      {more.length > 0 && (
        <section className="surface-card-operator p-5 rounded-xl border border-silver-200 bg-white space-y-3">
          <h3 className="text-sm font-semibold text-ink-heading">Also needs attention</h3>
          {more.map(task => (
            <div key={task.id} className="py-3 border-t border-silver-100 first:border-0 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <OwnershipLine action={task.action} ownerKind={task.ownerKind} due="today" />
                <GuidanceNote>{task.detail}</GuidanceNote>
              </div>
              <button type="button" onClick={task.onAction} className="btn-primary-operator text-xs shrink-0">
                {task.button}
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="surface-card-operator p-5 rounded-xl border border-silver-200 bg-white space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink-heading">New inquiries</h3>
          <button type="button" onClick={nav.goToLeads} className="text-xs font-medium text-ink-heading underline">
            Open leads
          </button>
        </div>
        {newLeads.length === 0 ? (
          <GuidanceNote>No new inquiries. When one arrives, mark the next step so your team sees it.</GuidanceNote>
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
