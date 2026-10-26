import { useState } from 'react';
import { OperatorPage } from '@/components/operator';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { DealershipProfilePanel } from '@/components/dealers/DealershipProfilePanel.tsx';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import {
  fetchDealershipPeople,
  createPersonInvite,
  resendPersonInvite,
  revokePersonInvite,
  type DealerAccessRole,
} from '@/lib/api/dealershipRecordApi.ts';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { Banner } from '@/components/ui';

type Props = OperatorPageBaseProps;
type SettingsSection = 'profile' | 'team';

export default function SettingsPage({ dealerId, nav, activeTab }: Props) {
  const [section, setSection] = useState<SettingsSection>('profile');

  // Team data fetching
  const { data: peopleData, loading: peopleLoading, error: peopleError, reload: reloadPeople } = useAsyncQuery(
    () => fetchDealershipPeople(dealerId),
    [dealerId],
  );

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<DealerAccessRole>('DEALER_STAFF');
  const [inviteName, setInviteName] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviteSending(true);
    setInviteMsg(null);
    try {
      const res = await createPersonInvite(dealerId, {
        email: inviteEmail,
        accessRole: inviteRole,
        name: inviteName || undefined,
      });
      setInviteMsg('Invitation sent successfully!');
      if (res.setupUrl) setGeneratedLink(res.setupUrl);
      reloadPeople();
    } catch (err: unknown) {
      setInviteMsg((err as Error).message || 'Failed to send invite');
    } finally {
      setInviteSending(false);
    }
  };

  const handleResend = async (id: string) => {
    try {
      await resendPersonInvite(dealerId, id);
      reloadPeople();
    } catch (err) {
      console.error('Failed to resend invite', err);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokePersonInvite(dealerId, id);
      reloadPeople();
    } catch (err) {
      console.error('Failed to revoke invite', err);
    }
  };

  return (
    <OperatorPage dealerId={dealerId} nav={nav} activeTab={activeTab} sectionLabel="Settings">
      <div className="max-w-4xl space-y-6">
        {/* Settings Navigation Tabs */}
        <div className="border-b border-silver-200">
          <nav className="flex gap-4">
            <button
              type="button"
              onClick={() => setSection('profile')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                section === 'profile'
                  ? 'border-navy-900 text-navy-900'
                  : 'border-transparent text-ink-muted hover:text-ink-body'
              }`}
            >
              Dealership & Notifications
            </button>
            <button
              type="button"
              onClick={() => setSection('team')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                section === 'team'
                  ? 'border-navy-900 text-navy-900'
                  : 'border-transparent text-ink-muted hover:text-ink-body'
              }`}
            >
              <span>Team & Access</span>
              {peopleData?.people && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-silver-100 text-ink-muted">
                  {peopleData.people.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Section 1: Profile & Notifications */}
        {section === 'profile' && (
          <div className="max-w-3xl">
            <DealershipProfilePanel dealerId={dealerId} mode="operator" />
          </div>
        )}

        {/* Section 2: Team & Access */}
        {section === 'team' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-ink-heading">Dealership Team & User Access</h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Manage colleagues with access to manage inventory, leads, and channel settings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInviteEmail('');
                  setInviteName('');
                  setInviteRole('DEALER_STAFF');
                  setInviteMsg(null);
                  setGeneratedLink(null);
                  setShowInviteModal(true);
                }}
                className="btn-primary-operator !py-2 !px-4 text-xs font-semibold self-start"
              >
                + Invite Team Member
              </button>
            </div>

            {peopleError && (
              <Banner variant="error" action={<button type="button" onClick={reloadPeople} className="text-xs underline">Retry</button>}>
                {peopleError}
              </Banner>
            )}

            {peopleLoading && !peopleData ? (
              <div className="surface-card-operator p-6">
                <Skeleton rows={6} />
              </div>
            ) : (
              <div className="surface-card-operator overflow-hidden p-0 border border-silver-200 rounded-xl bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-silver-50 text-ink-muted border-b border-silver-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name / Email</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-silver-200">
                    {peopleData?.people.map(person => (
                      <tr key={person.accountId} className="hover:bg-silver-50/50">
                        <td className="px-4 py-3 font-medium text-ink-heading">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <div>
                              <span>{person.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-muted font-medium">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            person.accessRole === 'DEALER_OWNER'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {person.accessRole === 'DEALER_OWNER' ? 'Owner / Admin' : 'Staff Member'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Pending invitations */}
                    {peopleData?.invitations?.map(inv => (
                      <tr key={inv.id} className="hover:bg-silver-50/50 bg-amber-50/20">
                        <td className="px-4 py-3 text-ink-heading">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span>{inv.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-silver-100 text-ink-muted border border-silver-200">
                            {inv.accessRole === 'DEALER_OWNER' ? 'Owner / Admin' : 'Staff Member'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                              Invite Pending
                            </span>
                            <button
                              type="button"
                              onClick={() => handleResend(inv.id)}
                              className="text-[11px] text-navy-700 hover:underline font-semibold"
                            >
                              Resend
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevoke(inv.id)}
                              className="text-[11px] text-red-600 hover:underline"
                            >
                              Revoke
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {(!peopleData?.people || peopleData.people.length === 0) && (!peopleData?.invitations || peopleData.invitations.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-ink-muted">
                          No team members registered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Invite Modal */}
            {showInviteModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-silver-200">
                  <div className="flex items-center justify-between pb-3 border-b border-silver-200">
                    <h3 className="font-bold text-sm text-ink-heading">Invite Colleague to Dealership</h3>
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(false)}
                      className="text-ink-muted hover:text-ink-heading text-lg leading-none"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSendInvite} className="mt-4 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink-heading mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder="colleague@dealership.com"
                        className="field-input w-full text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink-heading mb-1">Name (Optional)</label>
                      <input
                        type="text"
                        value={inviteName}
                        onChange={e => setInviteName(e.target.value)}
                        placeholder="Sarah Connor"
                        className="field-input w-full text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink-heading mb-1">Access Role</label>
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value as DealerAccessRole)}
                        className="field-input w-full text-xs"
                      >
                        <option value="DEALER_STAFF">Staff Member (Inventory & Leads)</option>
                        <option value="DEALER_OWNER">Dealership Owner / Manager (Full Access)</option>
                      </select>
                    </div>

                    {inviteMsg && (
                      <div className={`p-2.5 rounded text-xs ${
                        inviteMsg.includes('success') ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                      }`}>
                        {inviteMsg}
                      </div>
                    )}

                    {generatedLink && (
                      <div className="p-2.5 rounded bg-silver-50 border border-silver-200 text-xs space-y-1">
                        <span className="font-bold text-ink-heading">Direct Setup URL:</span>
                        <p className="font-mono text-[10px] break-all select-all">{generatedLink}</p>
                      </div>
                    )}

                    <div className="pt-2 flex justify-end gap-2 border-t border-silver-200">
                      <button
                        type="button"
                        onClick={() => setShowInviteModal(false)}
                        className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-silver-300 text-ink-muted hover:text-ink-heading"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={inviteSending}
                        className="btn-primary-operator !py-1.5 !px-4 text-xs font-semibold"
                      >
                        {inviteSending ? 'Sending…' : 'Send Invitation'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </OperatorPage>
  );
}
