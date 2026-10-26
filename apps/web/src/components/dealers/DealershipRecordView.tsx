import { useEffect, useState } from 'react';
import {
  fetchAdminDealershipRecord,
  patchAdminDealershipRecord,
  fetchDealershipPeople,
  createPersonInvite,
  resendPersonInvite,
  revokePersonInvite,
  createTemporaryLogin,
  completeHandoff,
  patchOnboarding,
  type DealershipRecordDetail,
  type PeopleResponse,
  type OnboardingStepKey,
  type DealerAccessRole,
} from '@/lib/api/dealershipRecordApi.ts';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { Banner } from '@/components/ui';
import { OwnershipLine } from '@/components/guidance/OwnershipLine.tsx';
import { DealershipAutopilot } from '@/components/guidance/DealershipAutopilot.tsx';
import { describeAutopilot } from '@/lib/autopilotStatus.ts';
import { GuidanceNote } from '@/components/guidance/GuidanceNote.tsx';

type SubTab = 'overview' | 'setup' | 'people' | 'vehicles' | 'channels' | 'activity';

type Props = {
  dealerId: string;
  initialSubTab?: SubTab;
  onOpenDealerView: (dealerId: string) => void;
  onBackToDirectory: () => void;
  onRefreshDealers?: () => void;
};

export function DealershipRecordView({
  dealerId,
  initialSubTab = 'overview',
  onOpenDealerView,
  onBackToDirectory,
  onRefreshDealers,
}: Props) {
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab);
  const [record, setRecord] = useState<DealershipRecordDetail | null>(null);
  const [peopleData, setPeopleData] = useState<PeopleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<DealerAccessRole>('DEALER_OWNER');
  const [inviteName, setInviteName] = useState('');
  const [generatedSetupUrl, setGeneratedSetupUrl] = useState<string | null>(null);

  // Temp login modal state
  const [showTempLoginModal, setShowTempLoginModal] = useState(false);
  const [tempPasswordReveal, setTempPasswordReveal] = useState<{ email: string; tempPass: string } | null>(null);

  // Welcome packet modal
  const [showWelcomePacket, setShowWelcomePacket] = useState(false);
  const [copiedPacket, setCopiedPacket] = useState(false);

  // Feedback toast
  const [toast, setToast] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [rec, ppl] = await Promise.all([
        fetchAdminDealershipRecord(dealerId),
        fetchDealershipPeople(dealerId).catch(() => null),
      ]);
      setRecord(rec);
      setPeopleData(ppl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dealership record');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [dealerId]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Step complete handler
  const handleToggleStepStatus = async (stepKey: OnboardingStepKey, currentStatus: string) => {
    if (!record) return;
    try {
      const newStatus = currentStatus === 'COMPLETE' ? 'IN_PROGRESS' : 'COMPLETE';
      await patchOnboarding(dealerId, { stepKey, status: newStatus as any });
      showToast(`Updated ${stepKey} to ${newStatus}`);
      await loadData();
      onRefreshDealers?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update step');
    }
  };

  // Send Invite
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      const res = await createPersonInvite(dealerId, {
        email: inviteEmail.trim(),
        accessRole: inviteRole,
        name: inviteName.trim() || undefined,
      });
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
      if (res.setupUrl) {
        setGeneratedSetupUrl(res.setupUrl);
      }
      showToast(`Invitation created for ${inviteEmail}`);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create invitation');
    }
  };

  // Issue Temporary Login
  const handleIssueTempLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      const res = await createTemporaryLogin(dealerId, {
        email: inviteEmail.trim(),
        accessRole: inviteRole,
        name: inviteName.trim() || undefined,
      });
      setShowTempLoginModal(false);
      setInviteEmail('');
      setTempPasswordReveal({ email: res.email, tempPass: res.temporaryPassword });
      showToast(`Temporary login generated for ${res.email}`);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate temporary login');
    }
  };

  // Resend Invite
  const handleResendInvite = async (inviteId: string) => {
    try {
      const result = await resendPersonInvite(dealerId, inviteId);
      setGeneratedSetupUrl(result.setupUrl);
      showToast('New invitation link created — copy and share it');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to resend invitation');
    }
  };

  // Revoke Invite
  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    try {
      await revokePersonInvite(dealerId, inviteId);
      showToast('Invitation revoked');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to revoke invitation');
    }
  };

  // Complete Handoff
  const handleCompleteHandoff = async () => {
    try {
      await completeHandoff(dealerId);
      showToast('Dealership handoff verified and completed!');
      await loadData();
      onRefreshDealers?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Handoff requirements not yet met');
    }
  };

  if (loading && !record) {
    return (
      <div className="surface-card-operator p-8 space-y-4">
        <Skeleton rows={8} />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="p-8">
        <Banner variant="error">{error || 'Dealership record not found'}</Banner>
        <button
          type="button"
          onClick={onBackToDirectory}
          className="mt-4 px-4 py-2 text-sm font-semibold rounded-md bg-navy-800 text-white"
        >
          ← Return to Directory
        </button>
      </div>
    );
  }

  const primaryOwnerInvite = record.invitations?.[0] || peopleData?.invites?.[0];
  const primaryOwnerPerson = record.people?.[0] || peopleData?.people?.[0];

  const welcomePacketText = `Welcome to StarterGrid Sales Portal!

Dealership: ${record.legalName}
Login Email: ${primaryOwnerPerson?.email || primaryOwnerInvite?.email || record.primaryContactEmail || 'Your email'}
Sign-In Portal: ${window.location.origin}/app/
${generatedSetupUrl ? `Activation Link: ${generatedSetupUrl}\n` : ''}
Your account gives you centralized inventory management and automated Autopilot syndication across Google, Meta, and partner marketplaces.

If you have any questions or need assistance, your assigned onboarding specialist is:
${record.internalOwner?.email || 'Antigravity Support Team'}

Best regards,
The StarterGrid Team`;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-navy-950 text-white px-4 py-3 rounded-lg shadow-elevation-3 border border-navy-700 text-sm flex items-center gap-2">
          <span>✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-silver-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDirectory}
            className="text-xs font-semibold text-ink-muted hover:text-ink-heading flex items-center gap-1"
          >
            ← Dealerships Directory
          </button>
          <span className="text-silver-300">/</span>
          <span className="text-sm font-bold text-ink-heading">{record.legalName}</span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowWelcomePacket(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-silver-300 bg-white hover:bg-silver-50 text-ink-heading shadow-sm flex items-center gap-1.5"
          >
            📋 Welcome Packet
          </button>
          <button
            type="button"
            onClick={() => onOpenDealerView(dealerId)}
            className="px-4 py-1.5 text-xs font-bold rounded-md bg-orange-600 hover:bg-orange-500 text-white shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <span>🎧 Open Dealer View</span>
            <span>↗</span>
          </button>
        </div>
      </div>

      {/* Persistent Record Header */}
      <div className="surface-card-operator p-6 rounded-xl border border-silver-200 bg-white shadow-elevation-1">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-navy-900 to-navy-700 text-white flex items-center justify-center font-bold text-xl shadow-inner shrink-0">
              {record.logoUrl ? (
                <img src={record.logoUrl} alt={record.legalName} className="w-full h-full object-cover rounded-xl" />
              ) : (
                record.legalName.charAt(0)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-ink-heading tracking-tight">{record.legalName}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    record.lifecycleStatus === 'ACTIVE'
                      ? 'bg-status-success-bg text-status-success-text border border-status-success-border'
                      : record.lifecycleStatus === 'SETTING_UP'
                      ? 'bg-status-warning-bg text-status-warning-text border border-status-warning-border'
                      : 'bg-silver-100 text-ink-muted border border-silver-300'
                  }`}
                >
                  {record.lifecycleStatus.replace(/_/g, ' ')}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-silver-100 text-ink-muted">
                  {record.businessCategory}
                </span>
              </div>
              {record.dbaName && (
                <p className="text-xs text-ink-muted mt-0.5 font-medium">DBA: {record.dbaName}</p>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                <span>
                  Internal Owner:{' '}
                  <strong className="text-ink-heading font-semibold">
                    {record.internalOwner?.email || 'Unassigned'}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Dealer Contact:{' '}
                  <strong className="text-ink-heading font-semibold">
                    {record.primaryContact?.name || record.primaryContactEmail || 'None'}
                  </strong>
                </span>
                <span>•</span>
                <span className="font-mono text-[11px] text-ink-faint">ID: {record.id}</span>
              </div>
            </div>
          </div>

          <div className="flex md:flex-col items-end gap-2">
            <span className="text-xs font-medium text-ink-heading">
              Autopilot {describeAutopilot({ preference: record.autopilotPreference }).label}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-silver-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <OwnershipLine
            action={record.nextStep?.nextAction || record.nextStep?.label || 'Continue setup'}
            ownerKind={record.nextStep?.ownerKind ?? 'OUR_TEAM'}
            ownerName={record.nextStep?.ownerName ?? record.internalOwner?.email}
            due={record.lifecycleStatus === 'ACTIVE' ? null : 'due today'}
          />
          <button
            type="button"
            onClick={() => setSubTab('setup')}
            className="btn-primary-operator text-xs shrink-0"
          >
            Continue setup
          </button>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="border-b border-silver-200">
        <nav className="flex gap-1 overflow-x-auto">
          {[
            { id: 'overview' as SubTab, label: 'Overview' },
            { id: 'setup' as SubTab, label: 'Setup & Onboarding', badge: record.onboardingSteps?.filter(s => s.status !== 'COMPLETE').length },
            { id: 'people' as SubTab, label: 'People & Access', count: (record.people?.length ?? 0) + (record.invitations?.length ?? 0) },
            { id: 'vehicles' as SubTab, label: 'Vehicles', count: record.inventory?.total },
            { id: 'channels' as SubTab, label: 'Channels', count: record.channels?.length },
            { id: 'activity' as SubTab, label: 'Activity & Audit' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                subTab === tab.id
                  ? 'border-orange-600 text-ink-heading bg-white rounded-t-lg'
                  : 'border-transparent text-ink-muted hover:text-ink-heading hover:border-silver-300'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {tab.badge}
                </span>
              )}
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-silver-100 text-ink-faint">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 1: Overview */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          <DealershipAutopilot
            dealerId={dealerId}
            preference={record.autopilotPreference}
            connectedChannelCount={record.channels?.filter(channel => channel.status === 'ACTIVE').length ?? 0}
            persist={async (preference) => {
              const next = await patchAdminDealershipRecord(dealerId, { autopilotPreference: preference });
              setRecord(next);
            }}
          />

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="surface-card-operator p-5 rounded-xl border border-silver-200 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">Access Status</span>
                <span className="text-lg">🔑</span>
              </div>
              <p className="mt-3 text-lg font-bold text-ink-heading">
                {primaryOwnerPerson?.firstLoginAt
                  ? 'Active & Logged In'
                  : primaryOwnerInvite
                  ? 'Invitation Sent'
                  : 'Needs Invite'}
              </p>
              <p className="text-xs text-ink-muted mt-1">
                {primaryOwnerInvite ? `Link created for ${primaryOwnerInvite.email}` : 'No active invite'}
              </p>
              <button
                type="button"
                onClick={() => setSubTab('people')}
                className="mt-3 text-xs font-semibold text-orange-600 hover:underline"
              >
                Manage people & access →
              </button>
            </div>

            <div className="surface-card-operator p-5 rounded-xl border border-silver-200 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">Inventory</span>
                <span className="text-lg">🚗</span>
              </div>
              <p className="mt-3 text-lg font-bold text-ink-heading">
                {record.inventory?.total ?? 0} Vehicles
              </p>
              <p className="text-xs text-ink-muted mt-1">
                {record.inventory?.ready ?? 0} ready to syndicate · {record.inventory?.needsAttention ?? 0} need attention
              </p>
              <button
                type="button"
                onClick={() => onOpenDealerView(dealerId)}
                className="mt-3 text-xs font-semibold text-orange-600 hover:underline"
              >
                View in dealership mode →
              </button>
            </div>

            <div className="surface-card-operator p-5 rounded-xl border border-silver-200 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">Distribution</span>
                <span className="text-lg">📡</span>
              </div>
              <p className="mt-3 text-lg font-bold text-ink-heading">
                {record.channels?.filter(c => c.status === 'ACTIVE').length ?? 0} Active Channels
              </p>
              <GuidanceNote>
                {describeAutopilot({
                  preference: record.autopilotPreference,
                  connectedChannelCount: record.channels?.filter(channel => channel.status === 'ACTIVE').length ?? 0,
                }).summary}
              </GuidanceNote>
              <button
                type="button"
                onClick={() => setSubTab('channels')}
                className="mt-3 text-xs font-semibold text-orange-600 hover:underline"
              >
                Inspect channel coverage →
              </button>
            </div>
          </div>

          {/* Business Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="surface-card-operator p-6 rounded-xl border border-silver-200 bg-white space-y-3">
              <h3 className="text-sm font-bold text-ink-heading">Business & Rooftop Details</h3>
              <div className="space-y-2 text-xs text-ink-body">
                <div>
                  <span className="text-ink-muted">Address: </span>
                  <span className="font-medium">
                    {record.rooftopAddress
                      ? `${record.rooftopAddress.street || ''}, ${record.rooftopAddress.city || ''}, ${record.rooftopAddress.state || ''} ${record.rooftopAddress.postalCode || ''}`
                      : 'Not provided'}
                  </span>
                </div>
                <div>
                  <span className="text-ink-muted">Website: </span>
                  <a href={record.websiteUrl || '#'} target="_blank" rel="noreferrer" className="text-navy-600 hover:underline">
                    {record.websiteUrl || 'None'}
                  </a>
                </div>
                <div>
                  <span className="text-ink-muted">Dealer License: </span>
                  <span className="font-mono">{record.dealerLicense || 'None'}</span>
                </div>
                <div>
                  <span className="text-ink-muted">Primary Phone: </span>
                  <span>{record.primaryContact?.phone || 'None'}</span>
                </div>
              </div>
            </div>

            <div className="surface-card-operator p-6 rounded-xl border border-silver-200 bg-white space-y-3">
              <h3 className="text-sm font-bold text-ink-heading">Onboarding Milestone Evidence</h3>
              <div className="space-y-2 text-xs text-ink-body">
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Created:</span>
                  <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Launch Completed:</span>
                  <span>{record.launchCompletedAt ? new Date(record.launchCompletedAt).toLocaleString() : 'Pending'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Owner Handoff:</span>
                  <span>{record.handoffCompletedAt ? new Date(record.handoffCompletedAt).toLocaleString() : 'Pending'}</span>
                </div>
                <div className="pt-2 border-t border-silver-200 flex justify-end">
                  <button
                    type="button"
                    onClick={handleCompleteHandoff}
                    className="px-3 py-1.5 text-xs font-bold rounded-md bg-navy-900 text-white hover:bg-navy-800"
                  >
                    Complete & Verify Handoff
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Guided Onboarding Stepper */}
      {subTab === 'setup' && (
        <div className="surface-card-operator p-6 rounded-xl border border-silver-200 bg-white space-y-6">
          <div>
            <h2 className="text-base font-bold text-ink-heading">5-Step Guided Dealership Onboarding</h2>
            <p className="text-xs text-ink-muted mt-1">
              Progress is persisted on the server and resumable by any authorized operator. Complete each step to launch.
            </p>
          </div>

          <div className="space-y-4">
            {record.onboardingSteps?.map((step, idx) => (
              <div
                key={step.key}
                className={`p-4 rounded-xl border transition-all ${
                  step.status === 'COMPLETE'
                    ? 'border-status-success-border bg-status-success-bg/20'
                    : step.status === 'IN_PROGRESS'
                    ? 'border-orange-300 bg-orange-50/30 ring-1 ring-orange-200'
                    : 'border-silver-200 bg-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        step.status === 'COMPLETE'
                          ? 'bg-status-success-bg text-status-success-text border border-status-success-border'
                          : 'bg-silver-100 text-ink-heading border border-silver-300'
                      }`}
                    >
                      {step.status === 'COMPLETE' ? '✓' : idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-ink-heading">{step.label}</h3>
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-silver-100 text-ink-muted">
                          Owner: {step.ownerKind}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {step.nextAction || 'Review details and complete required evidence.'}
                      </p>
                      {step.blockingReason && (
                        <p className="text-xs text-status-error-text mt-1 font-medium">
                          ⚠️ {step.blockingReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {step.key === 'ACCESS' && (
                      <button
                        type="button"
                        onClick={() => setSubTab('people')}
                        className="px-3 py-1.5 text-xs font-semibold rounded-md border border-silver-300 text-ink-heading hover:bg-silver-50"
                      >
                        Manage Logins →
                      </button>
                    )}
                    {step.key === 'VEHICLES' && (
                      <button
                        type="button"
                        onClick={() => onOpenDealerView(dealerId)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-md border border-silver-300 text-ink-heading hover:bg-silver-50"
                      >
                        Add Stock →
                      </button>
                    )}
                    {step.key === 'CHANNELS' && (
                      <button
                        type="button"
                        onClick={() => setSubTab('channels')}
                        className="px-3 py-1.5 text-xs font-semibold rounded-md border border-silver-300 text-ink-heading hover:bg-silver-50"
                      >
                        Channels →
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggleStepStatus(step.key, step.status)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                        step.status === 'COMPLETE'
                          ? 'border border-silver-300 bg-white text-ink-muted hover:bg-silver-100'
                          : 'bg-navy-900 text-white hover:bg-navy-800'
                      }`}
                    >
                      {step.status === 'COMPLETE' ? 'Mark Incomplete' : 'Mark Complete ✓'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: People & Access (Authoritative Answer to "How Does This Dealer Log In?") */}
      {subTab === 'people' && (
        <div className="surface-card-operator p-6 rounded-xl border border-silver-200 bg-white space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-ink-heading">People & Initial Access</h2>
              <p className="text-xs text-ink-muted mt-1">
                Manage dealership accounts, send invitations, issue temporary credentials, and diagnose login issues.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setInviteEmail('');
                  setInviteRole('DEALER_OWNER');
                  setShowTempLoginModal(true);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-silver-300 bg-white hover:bg-silver-50 text-ink-heading"
              >
                ⚡ Issue Temp Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setInviteEmail('');
                  setInviteRole('DEALER_OWNER');
                  setShowInviteModal(true);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-md bg-navy-900 hover:bg-navy-800 text-white shadow-sm"
              >
                + Invite Person
              </button>
            </div>
          </div>

          {/* Generated Setup URL Banner (if just created) */}
          {generatedSetupUrl && (
            <div className="p-4 rounded-xl border border-status-success-border bg-status-success-bg/40 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-status-success-text">✓ Invitation Created! Setup Link Generated</span>
                <button
                  type="button"
                  onClick={() => setGeneratedSetupUrl(null)}
                  className="text-ink-muted hover:text-ink-heading"
                >
                  ✕
                </button>
              </div>
              <p className="text-ink-body font-mono text-[11px] p-2 bg-white rounded border border-silver-200 select-all break-all">
                {generatedSetupUrl}
              </p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedSetupUrl);
                  showToast('Setup URL copied to clipboard');
                }}
                className="px-3 py-1 text-xs font-bold rounded bg-status-success-text text-white"
              >
                Copy Setup Link
              </button>
            </div>
          )}

          {/* Temporary Password Reveal Modal/Box */}
          {tempPasswordReveal && (
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900">⚠️ Temporary Password Created (One-Time Display)</span>
                <button
                  type="button"
                  onClick={() => setTempPasswordReveal(null)}
                  className="text-amber-800 hover:text-amber-950 font-bold"
                >
                  ✕
                </button>
              </div>
              <p className="text-amber-800">
                Credentials for <strong>{tempPasswordReveal.email}</strong>. Must be changed upon first login:
              </p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold bg-white px-3 py-1.5 rounded border border-amber-200 text-ink-heading">
                  {tempPasswordReveal.tempPass}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(tempPasswordReveal.tempPass);
                    showToast('Temporary password copied');
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded bg-amber-700 text-white hover:bg-amber-800"
                >
                  Copy Password
                </button>
              </div>
            </div>
          )}

          {/* Active Members & Invitations Table */}
          <div className="border border-silver-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-silver-50 text-ink-muted border-b border-silver-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Person / Email</th>
                  <th className="px-4 py-3 font-semibold">Rooftop Role</th>
                  <th className="px-4 py-3 font-semibold">Account State</th>
                  <th className="px-4 py-3 font-semibold">First / Last Login</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-200">
                {/* Active Accounts */}
                {record.people?.map(p => (
                  <tr key={p.id} className="hover:bg-silver-50/50">
                    <td className="px-4 py-3 font-medium text-ink-heading">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-status-success-text" />
                        <span>{p.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{p.accessRole}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-success-bg text-status-success-text border border-status-success-border">
                        Active Account
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {p.firstLoginAt ? new Date(p.firstLoginAt).toLocaleDateString() : 'Never logged in'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setInviteEmail(p.email);
                          setInviteRole(p.accessRole);
                          setShowTempLoginModal(true);
                        }}
                        className="text-orange-600 hover:underline font-semibold"
                      >
                        Reset Temp Pass
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Outstanding Invitations */}
                {record.invitations?.map(inv => (
                  <tr key={inv.id} className="hover:bg-silver-50/50 bg-amber-50/20">
                    <td className="px-4 py-3 font-medium text-ink-heading">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-status-warning-text" />
                        <span>{inv.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{inv.accessRole}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-warning-bg text-status-warning-text border border-status-warning-border">
                        {inv.deliveryStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleResendInvite(inv.id)}
                        className="text-navy-600 hover:underline font-semibold"
                      >
                        Resend
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevokeInvite(inv.id)}
                        className="text-status-error-text hover:underline font-semibold"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}

                {(!record.people || record.people.length === 0) &&
                  (!record.invitations || record.invitations.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-ink-muted">
                        No team members or invitations found for this dealership.
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Vehicles View */}
      {subTab === 'vehicles' && (
        <div className="surface-card-operator p-6 rounded-xl border border-silver-200 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-ink-heading">Dealership Vehicles</h2>
              <p className="text-xs text-ink-muted mt-0.5">
                {record.inventory?.total ?? 0} total vehicles · {record.inventory?.ready ?? 0} ready for distribution
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenDealerView(dealerId)}
              className="px-3.5 py-1.5 text-xs font-bold rounded-md bg-orange-600 text-white hover:bg-orange-500"
            >
              Open Inventory Editor ↗
            </button>
          </div>
          <div className="p-8 text-center bg-silver-50 rounded-xl border border-dashed border-silver-300">
            <p className="text-sm font-semibold text-ink-heading">Direct Dealership Inventory Access</p>
            <p className="text-xs text-ink-muted max-w-md mx-auto mt-1">
              To add stock, edit photos, decode VINs, or upload CSV files for this rooftop, open Dealer View.
            </p>
            <button
              type="button"
              onClick={() => onOpenDealerView(dealerId)}
              className="mt-4 px-4 py-2 text-xs font-bold rounded-md bg-navy-900 text-white hover:bg-navy-800"
            >
              Launch Vehicles in Dealer Support Mode →
            </button>
          </div>
        </div>
      )}

      {/* Tab 5: Channels View */}
      {subTab === 'channels' && (
        <div className="surface-card-operator p-6 rounded-xl border border-silver-200 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-ink-heading">Destinations</h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Connected is not the same as live. Open dealer view to inspect a destination.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenDealerView(dealerId)}
              className="px-3.5 py-1.5 text-xs font-bold rounded-md bg-orange-600 text-white hover:bg-orange-500"
            >
              Open Channels Workspace ↗
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {record.channels?.map(channel => (
              <div key={channel.slug} className="p-4 rounded-xl border border-silver-200 bg-silver-50/50 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-ink-heading">{channel.name}</h4>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {channel.status === 'ACTIVE' ? 'Connected' : channel.status.replace(/_/g, ' ').toLowerCase()}
                    {channel.eligibleVehicles ? ` · ${channel.eligibleVehicles} eligible` : ''}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    channel.status === 'ACTIVE'
                      ? 'bg-status-success-bg text-status-success-text border border-status-success-border'
                      : 'bg-silver-100 text-ink-muted border border-silver-300'
                  }`}
                >
                  {channel.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Activity View */}
      {subTab === 'activity' && (
        <div className="surface-card-operator p-6 rounded-xl border border-silver-200 bg-white space-y-4">
          <h2 className="text-base font-bold text-ink-heading">Audit & Activity Trail</h2>
          <div className="space-y-3">
            <div className="p-3 bg-silver-50 rounded-lg text-xs flex items-center justify-between">
              <div>
                <span className="font-semibold text-ink-heading">Dealership record created</span>
                <p className="text-[11px] text-ink-muted">Initialized with AUTOMOTIVE business category</p>
              </div>
              <span className="text-ink-faint font-mono">{new Date(record.createdAt).toLocaleDateString()}</span>
            </div>
            {record.launchCompletedAt && (
              <div className="p-3 bg-status-success-bg/30 border border-status-success-border rounded-lg text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold text-status-success-text">Launch verification passed</span>
                  <p className="text-[11px] text-ink-muted">Validated against active channel policies</p>
                </div>
                <span className="text-ink-faint font-mono">{new Date(record.launchCompletedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite Person Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-silver-200 p-6 shadow-elevation-3">
            <h3 className="text-base font-bold text-ink-heading">Invite Person to Dealership</h3>
            <p className="text-xs text-ink-muted mt-1">
              Sends an invitation link allowing the recipient to establish their password.
            </p>
            <form onSubmit={handleSendInvite} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-heading mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="owner@dealership.com"
                  className="w-full px-3 py-2 text-xs border border-silver-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-heading mb-1">Full Name (Optional)</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="Jordan Smith"
                  className="w-full px-3 py-2 text-xs border border-silver-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-heading mb-1">Rooftop Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as DealerAccessRole)}
                  className="w-full px-3 py-2 text-xs border border-silver-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-500"
                >
                  <option value="DEALER_OWNER">Dealer Owner (Full rooftop administration)</option>
                  <option value="DEALER_STAFF">Dealer Staff (Inventory and leads only)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md text-ink-muted hover:bg-silver-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-md bg-navy-900 text-white hover:bg-navy-800"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Temp Login Modal */}
      {showTempLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-silver-200 p-6 shadow-elevation-3">
            <h3 className="text-base font-bold text-ink-heading">Issue Temporary Credentials</h3>
            <p className="text-xs text-ink-muted mt-1">
              Generates a one-time temporary password. The user will be required to change it on first login.
            </p>
            <form onSubmit={handleIssueTempLogin} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-heading mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="dealer@example.com"
                  className="w-full px-3 py-2 text-xs border border-silver-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-heading mb-1">Rooftop Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as DealerAccessRole)}
                  className="w-full px-3 py-2 text-xs border border-silver-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-500"
                >
                  <option value="DEALER_OWNER">Dealer Owner</option>
                  <option value="DEALER_STAFF">Dealer Staff</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTempLoginModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md text-ink-muted hover:bg-silver-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-md bg-amber-600 text-white hover:bg-amber-700"
                >
                  Generate Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Welcome Packet Modal */}
      {showWelcomePacket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl border border-silver-200 p-6 shadow-elevation-3 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ink-heading">Dealership Welcome Packet</h3>
              <button
                type="button"
                onClick={() => setShowWelcomePacket(false)}
                className="text-ink-muted hover:text-ink-heading font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-ink-muted">
              Copy this pre-formatted welcome message to email or SMS to the dealership principal:
            </p>
            <textarea
              readOnly
              rows={12}
              value={welcomePacketText}
              className="w-full p-3 font-mono text-xs border border-silver-200 rounded-lg bg-silver-50 text-ink-body focus:outline-none"
            />
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-status-success-text font-semibold">
                {copiedPacket ? '✓ Copied to clipboard!' : ''}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowWelcomePacket(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-silver-100 rounded-md"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(welcomePacketText);
                    setCopiedPacket(true);
                    setTimeout(() => setCopiedPacket(false), 3000);
                  }}
                  className="px-4 py-1.5 text-xs font-bold rounded-md bg-navy-900 text-white hover:bg-navy-800"
                >
                  Copy Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
