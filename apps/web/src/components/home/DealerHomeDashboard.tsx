import { useEffect, useState, useMemo } from 'react';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import {
  fetchDealershipProfile,
  fetchPublishStatus,
  fetchDealerLeads,
  fetchPublishHistory,
  type DealerLead,
} from '@/lib/api/sdk.ts';
import type {
  DealershipProfile,
  PublishStatusResponse,
  HistoryResponse,
} from '@/lib/types.ts';
import { GettingStartedChecklist } from './GettingStartedChecklist.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';

type Props = {
  dealerId: string;
  nav: OperatorNavHandlers;
};

type ActionableIssue = {
  id: string;
  title: string;
  detail: string;
  channels: string;
  owner: 'Dealership (You)' | 'Our Team (Support)' | 'Partner';
  actionLabel: string;
  onAction: () => void;
  severity: 'warning' | 'error';
};

export function DealerHomeDashboard({ dealerId, nav }: Props) {
  const [profile, setProfile] = useState<DealershipProfile | null>(null);
  const [status, setStatus] = useState<PublishStatusResponse | null>(null);
  const [leads, setLeads] = useState<DealerLead[]>([]);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [autopilotActive, setAutopilotActive] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchDealershipProfile(dealerId).catch(() => null),
      fetchPublishStatus(dealerId).catch(() => null),
      fetchDealerLeads(dealerId, { limit: 5 }).catch(() => ({ leads: [] })),
      fetchPublishHistory(dealerId, { limit: 5 }).catch(() => null),
    ])
      .then(([prof, stat, leadRes, hist]) => {
        if (!active) return;
        setProfile(prof);
        setStatus(stat);
        setLeads(leadRes?.leads ?? []);
        setHistory(hist);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [dealerId]);

  // Derived metrics
  const activePlatforms = useMemo(() => {
    if (!status?.platforms) return [];
    return status.platforms.filter(
      p => p.accountState === 'ACTIVE' || p.state === 'Active' || p.state === 'Ready' || p.state === 'Scheduled',
    );
  }, [status]);

  const totalVehicles = status?.vehicles.total ?? 0;
  const readyVehicles = status?.vehicles.ready ?? 0;

  // Actionable issues with the signature Ownership Line
  const actionableIssues: ActionableIssue[] = useMemo(() => {
    const list: ActionableIssue[] = [];

    // Critical profile warnings
    if (profile?.publishingWarnings) {
      profile.publishingWarnings
        .filter(w => w.severity === 'critical')
        .forEach((w, idx) => {
          list.push({
            id: `prof-${idx}`,
            title: `Dealership Profile: ${w.field} is missing`,
            detail: w.message,
            channels: 'Required by all advertising channels',
            owner: 'Dealership (You)',
            actionLabel: 'Update Profile',
            onAction: nav.goToSettings,
            severity: 'error',
          });
        });
    }

    // Platform connection issues (e.g. Expired credentials or setup needed)
    if (status?.platforms) {
      status.platforms.forEach(p => {
        if (p.accountState === 'DISCONNECTED' || p.accountState === 'ERROR') {
          list.push({
            id: `plat-${p.platformSlug}`,
            title: `${p.platformName} requires re-authentication`,
            detail: 'Channel distribution is paused until credentials are refreshed.',
            channels: p.platformName,
            owner: 'Dealership (You)',
            actionLabel: 'Reconnect Channel',
            onAction: nav.goToPlatforms,
            severity: 'warning',
          });
        }
      });
    }

    // Vehicle readiness issues if any exist
    const blockedCount = status?.vehicles?.blocked ?? 0;
    if (blockedCount > 0) {
      list.push({
        id: 'veh-errors',
        title: `${blockedCount} vehicle${blockedCount === 1 ? '' : 's'} missing required pricing or photos`,
        detail: 'Incomplete vehicles cannot be syndicated to Google or Meta until required fields are added.',
        channels: 'Google Vehicle Ads & Meta Automotive',
        owner: 'Dealership (You)',
        actionLabel: 'Review Vehicles',
        onAction: () => nav.goToInventory(),
        severity: 'warning',
      });
    }

    return list;
  }, [profile, status, nav]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="surface-card-operator p-6 rounded-xl">
          <Skeleton rows={6} />
        </div>
      </div>
    );
  }

  const isBrandNew = totalVehicles === 0 || activePlatforms.length === 0;

  return (
    <div className="space-y-6">
      {/* 1. Overall Distribution Status & Autopilot Card */}
      <div className="surface-card-operator p-6 rounded-xl border border-silver-200 bg-white shadow-elevation-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-3 h-3 rounded-full ${
                  autopilotActive ? 'bg-status-success-text animate-pulse' : 'bg-status-warning-text'
                }`}
              />
              <h2 className="text-lg font-bold text-ink-heading">
                {autopilotActive ? 'Autopilot Active' : 'Autopilot Paused'}
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-status-success-bg text-status-success-text border border-status-success-border">
                {activePlatforms.length} Channels Connected
              </span>
            </div>
            <p className="text-xs text-ink-muted">
              Distributing <strong className="text-ink-heading font-semibold">{readyVehicles}</strong> eligible vehicles
              across {activePlatforms.length} active sales channels. Automated inventory sync runs on vehicle updates.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setAutopilotActive(!autopilotActive)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                autopilotActive
                  ? 'bg-silver-100 hover:bg-silver-200 text-ink-heading border-silver-300'
                  : 'bg-navy-900 hover:bg-navy-800 text-white border-navy-950'
              }`}
            >
              {autopilotActive ? 'Pause Autopilot' : 'Resume Autopilot'}
            </button>
            <button
              type="button"
              onClick={nav.goToPlatforms}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors"
            >
              Manage Channels →
            </button>
          </div>
        </div>

        {/* Quick Channel Pill List */}
        {activePlatforms.length > 0 && (
          <div className="mt-4 pt-3 border-t border-silver-200/70 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-ink-faint uppercase tracking-wider">Active:</span>
            {activePlatforms.map(p => (
              <span
                key={p.platformSlug}
                className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-silver-100 text-ink-heading border border-silver-200"
              >
                {p.platformName} <span className="font-mono text-[10px] text-ink-faint">({readyVehicles})</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 2. Onboarding Stepper (Minimal guidance, only when dealer is brand new) */}
      {isBrandNew && (
        <div className="mb-6">
          <GettingStartedChecklist dealerId={dealerId} nav={nav} />
        </div>
      )}

      {/* 3. Actionable Issues: Needs Attention */}
      <div className="surface-card-operator p-6 rounded-xl border border-silver-200 bg-white shadow-elevation-1 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-ink-heading">Needs Attention</h3>
            {actionableIssues.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {actionableIssues.length} action item{actionableIssues.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          {actionableIssues.length > 0 && (
            <span className="text-xs text-ink-faint">Resolved issues disappear automatically</span>
          )}
        </div>

        {actionableIssues.length > 0 ? (
          <div className="space-y-3">
            {actionableIssues.map(issue => (
              <div
                key={issue.id}
                className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">⚠️</span>
                    <span className="text-xs font-bold text-ink-heading">{issue.title}</span>
                  </div>
                  <p className="text-xs text-ink-muted">{issue.detail}</p>
                  <div className="flex items-center gap-2 text-[11px] text-ink-faint pt-1">
                    <span>{issue.channels}</span>
                    <span>•</span>
                    <span className="font-semibold text-ink-heading">Owner: {issue.owner}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={issue.onAction}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-navy-900 hover:bg-navy-800 text-white self-end sm:self-center shrink-0 shadow-sm"
                >
                  {issue.actionLabel} →
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-silver-50 rounded-xl border border-dashed border-silver-200">
            <p className="text-xs font-semibold text-status-success-text flex items-center justify-center gap-1.5">
              <span>✓</span>
              <span>All systems healthy. No blocking issues detected on your inventory or channels.</span>
            </p>
          </div>
        )}
      </div>

      {/* 4. Meaningful Activity & New Inquiries (2-column layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Meaningful Activity */}
        <div className="surface-card-operator p-6 rounded-xl border border-silver-200 bg-white shadow-elevation-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink-heading">Recent Distribution Activity</h3>
            <span className="text-xs text-ink-faint">Automated updates</span>
          </div>

          <div className="space-y-3 text-xs text-ink-body">
            <div className="p-3 bg-silver-50 rounded-lg flex items-start gap-2.5">
              <span className="text-status-success-text font-bold">✓</span>
              <div>
                <p className="font-medium text-ink-heading">
                  Automated sync active across {activePlatforms.length} channels
                </p>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Eligible vehicles verified and formatted for public syndication.
                </p>
              </div>
            </div>

            {history?.events?.slice(0, 3).map((event: any, idx: number) => (
              <div key={idx} className="p-3 border border-silver-200 rounded-lg flex items-start gap-2.5">
                <span className="text-ink-muted">📡</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink-heading truncate">{event.platformSlug || 'Syndication Engine'}</p>
                  <p className="text-[11px] text-ink-muted">{event.action || 'Inventory state synchronized'}</p>
                </div>
                <span className="text-[10px] text-ink-faint shrink-0 font-mono">
                  {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* New Buyer Inquiries Preview */}
        <div className="surface-card-operator p-6 rounded-xl border border-silver-200 bg-white shadow-elevation-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-ink-heading">Inbound Buyer Inquiries</h3>
              {leads.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {leads.length} new
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={nav.goToLeads}
              className="text-xs font-semibold text-orange-600 hover:underline"
            >
              Open Inbox →
            </button>
          </div>

          {leads.length > 0 ? (
            <div className="space-y-3">
              {leads.slice(0, 3).map(lead => (
                <div
                  key={lead.id}
                  onClick={nav.goToLeads}
                  className="p-3.5 rounded-lg border border-silver-200 hover:border-silver-300 hover:bg-silver-50/50 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink-heading truncate">
                        {lead.contactName || 'Anonymous Buyer'}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-silver-100 text-ink-muted">
                        {lead.platformSlug}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted truncate mt-0.5">
                      {lead.vehicle
                        ? `${lead.vehicle.year} ${lead.vehicle.make} ${lead.vehicle.model}`
                        : lead.message || 'Interested in vehicle'}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-orange-600 shrink-0">Reply →</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-silver-50 rounded-xl border border-dashed border-silver-200">
              <p className="text-xs text-ink-muted">No new buyer inquiries yet today.</p>
              <p className="text-[11px] text-ink-faint mt-1">Leads from all channels appear in your shared inbox.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
