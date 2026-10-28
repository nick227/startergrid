import { useEffect, useMemo, useState } from 'react';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import {
  fetchDealershipProfile,
  fetchPublishStatus,
  fetchDealerLeads,
  type DealerLead,
} from '@/lib/api/sdk.ts';
import type { DealershipProfile, PublishStatusResponse } from '@/lib/types.ts';
import { GuidanceNote } from '@/components/guidance/GuidanceNote.tsx';
import { PagePrimaryState } from '@/components/guidance/PagePrimaryState.tsx';
import { GettingStartedChecklist } from './GettingStartedChecklist.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { dealerSetupIncomplete, operatingPosture, platformLooksConnected } from '@/lib/pagePrimaryState.ts';
import { workspaceHash } from '@/lib/routes.ts';
import { fetchSyndicationSentryAudit, type SyndicationSentryAuditResult } from '@/lib/api/sentryApi.ts';
import { fetchAttention, type AttentionResponse } from '@/lib/api/attentionApi.ts';
import { DealerAttentionSection } from './DealerAttentionSection.tsx';

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
  const [attention, setAttention] = useState<AttentionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    Promise.all([
      fetchDealershipProfile(dealerId).catch(() => null),
      fetchPublishStatus(dealerId).catch(() => null),
      fetchDealerLeads(dealerId, { limit: 5 }).catch(() => ({ leads: [] })),
      fetchSyndicationSentryAudit(dealerId).catch(() => null),
      fetchAttention(dealerId).catch(() => null),
    ]).then(([nextProfile, nextStatus, leadRes, nextSentry, nextAttention]) => {
      if (!live) return;
      setProfile(nextProfile);
      setStatus(nextStatus);
      setLeads(leadRes?.leads ?? []);
      setSentryAudit(nextSentry);
      setAttention(nextAttention);
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
    missingPrimaryContact: profile.publishingWarnings.some(w => w.field === 'primaryContact.email'),
  }));

  const tasks = useMemo<HomeTask[]>(() => {
    const list: HomeTask[] = [];
    profile?.publishingWarnings?.filter(w => w.severity === 'critical').forEach((warning, index) => {
      list.push({
        id: `profile-${index}`,
        action: `Add ${warning.label || warning.field}`,
        detail: warning.message,
        ownerKind: 'YOU',
        button: 'Open Company',
        onAction: () => { window.location.hash = workspaceHash(dealerId, 'company', warning.field.startsWith('primaryContact') ? 'email' : 'identity'); },
      });
    });
    if (blocked > 0) {
      list.push({
        id: 'vehicles',
        action: `Fix ${blocked} vehicle${blocked === 1 ? '' : 's'} that cannot list`,
        detail: 'Usually a missing price or photos.',
        ownerKind: 'YOU',
        button: 'Review vehicles',
        onAction: () => nav.goToInventory({ filter: 'Blocked' }),
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
        action: `${ghostCount} sold vehicle${ghostCount === 1 ? '' : 's'} may still be advertised`,
        detail: 'Sold vehicles may still appear on connected advertising channels. Request removal so shoppers do not call about a vehicle that left the lot.',
        ownerKind: 'YOU',
        button: 'Open channels',
        onAction: nav.goToPlatforms,
      });
    }
    return list;
  }, [profile, status, dealerId, nav, blocked, sentryAudit]);

  if (loading) {
    return <div className="surface-card-operator p-6 rounded-xl"><Skeleton rows={6} /></div>;
  }

  const blockingAttention = attention?.items?.find(i => i.owner === 'DEALERSHIP' && i.severity === 'BLOCKING');
  const actionAttention = attention?.items?.find(i => i.owner === 'DEALERSHIP' && i.severity !== 'WAITING');
  const topAttention = blockingAttention || actionAttention;

  const top = topAttention
    ? {
        id: topAttention.key,
        action: topAttention.summary,
        detail: topAttention.nextAction,
        ownerKind: 'YOU' as const,
        button: topAttention.action.enabled
          ? (topAttention.action.kind === 'FIX_VEHICLES' || topAttention.action.kind === 'ADD_PHOTOS' ? 'Review vehicles'
            : topAttention.action.kind === 'REVIEW_REMOVALS' ? 'Open take-down card'
            : topAttention.action.kind === 'END_EXTERNAL_LISTING' ? 'Open channels'
            : topAttention.action.kind === 'COMPLETE_CHANNEL_SETUP' ? 'Set up channel'
            : topAttention.action.kind === 'RETRY_CRM_DELIVERY' ? 'Open leads'
            : 'Review')
          : '',
        onAction: () => {
          if (!topAttention.action.enabled) return;
          const vehicleIds = (topAttention.records || [])
            .map(r => r.vehicleId || (r.type === 'VEHICLE' ? r.id : null))
            .filter((id): id is string => Boolean(id));

          if (topAttention.action.kind === 'FIX_VEHICLES') {
            nav.goToInventory({ filter: 'Blocked', ids: vehicleIds.length > 0 ? vehicleIds : undefined });
          } else if (topAttention.action.kind === 'ADD_PHOTOS') {
            nav.goToInventory({ filter: 'Needs photos', ids: vehicleIds.length > 0 ? vehicleIds : undefined });
          } else if (topAttention.action.kind === 'REVIEW_REMOVALS' || topAttention.action.kind === 'END_EXTERNAL_LISTING' || topAttention.action.kind === 'COMPLETE_CHANNEL_SETUP') {
            if (topAttention.action.channel) nav.goToPlatformDetail(topAttention.action.channel);
            else nav.goToPlatforms();
          } else if (topAttention.action.kind === 'OPEN_LEADS') {
            nav.goToLeads();
          } else if (topAttention.action.kind === 'RETRY_CRM_DELIVERY') {
            const leadRecord = topAttention.records?.find(r => r.type === 'LEAD') || topAttention.records?.[0];
            nav.goToLeads({ leadId: leadRecord?.id });
          } else if (topAttention.action.kind === 'CONTACT_SUPPORT') {
            window.location.href = 'mailto:support@startergrid.com';
          }
        },
      }
    : tasks[0];

  const inquiryCount = newLeads.length;
  const posture = operatingPosture({
    vehicleTotal: status?.vehicles.total ?? 0,
    channelConfigured: connectedCount > 0,
    leadCount: leads.length,
    problemCount: (attention?.items.filter(item => item.owner === 'DEALERSHIP' && item.severity !== 'WAITING').length ?? 0) + tasks.length + inquiryCount,
    checksIncomplete: !attention || attention.unavailableAreas.length > 0,
  });
  const unconfigured = posture === 'unconfigured';

  return (
    <div className="space-y-5">
      {!attention && <p role="alert" className="text-red-700">Needs Attention could not load. Refresh to try again.</p>}
      <PagePrimaryState
        kind={unconfigured ? 'empty' : top ? 'attention' : posture === 'clear' ? 'running' : 'attention'}
        title={
          unconfigured
            ? 'This dealership is not set up yet'
            : top
              ? top.action
              : inquiryCount > 0
                ? `${inquiryCount} new inquir${inquiryCount === 1 ? 'y' : 'ies'}`
                : posture === 'clear'
                  ? 'All clear'
                  : 'Some activity could not be checked'
        }
        why={
          unconfigured
            ? 'There are no vehicles, connected channels, or inquiries to review. That is missing setup, not a clean result.'
            : top
              ? top.detail
              : inquiryCount > 0
                ? 'A shopper asked about a vehicle. Mark the next step so your team sees it.'
                : posture === 'clear'
                  ? 'Vehicles, channels, and inquiries were checked. Nothing needs a fix right now.'
                  : 'Refresh before treating this dealership as clear. Part of the check did not finish.'
        }
        ownerKind={!unconfigured && top ? top.ownerKind : !unconfigured && inquiryCount > 0 ? 'YOU' : undefined}
        actionLabel={unconfigured ? 'Add vehicles' : top && top.button ? top.button : inquiryCount > 0 ? 'Open leads' : undefined}
        onAction={unconfigured ? () => nav.goToInventory() : top && top.button ? top.onAction : inquiryCount > 0 ? () => nav.goToLeads() : undefined}
        secondaryLabel={unconfigured ? 'Connect a channel' : undefined}
        onSecondary={unconfigured ? () => nav.goToPlatforms() : undefined}
      />

      {firstTime && <GettingStartedChecklist dealerId={dealerId} nav={nav} profile={profile} status={status} />}

      <DealerAttentionSection dealerId={dealerId} attention={attention} nav={nav} posture={posture} />

      {!unconfigured && <section className="surface-card-operator p-5 rounded-xl border border-silver-200 bg-white space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink-heading">New inquiries</h3>
          <button type="button" onClick={() => nav.goToLeads()} className="text-xs font-medium text-ink-heading underline">
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
              onClick={() => nav.goToLeads()}
              className="w-full text-left py-2 border-t border-silver-100 first:border-0 first:pt-0"
            >
              <p className="text-sm font-medium text-ink-heading">{lead.contactName || 'Buyer'}</p>
              <p className="text-xs text-ink-muted">
                {lead.vehicle ? `${lead.vehicle.year} ${lead.vehicle.make} ${lead.vehicle.model}` : 'Inventory inquiry'}
              </p>
            </button>
          ))
        )}
      </section>}
    </div>
  );
}
