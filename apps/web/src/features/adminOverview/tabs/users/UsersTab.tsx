import { useCallback, useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { ErrorState } from '@/components/operator/index.ts';
import { DealershipIntakeFlow } from '@/components/dealers/DealershipIntakeFlow.tsx';
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  type OperatorUserRole,
  type OperatorUserSummary,
  updateAdminUser,
} from '@/lib/api/admin.ts';
import { createAdminDealership, uploadDealerLogo } from '@/lib/api/sdk.ts';
import type { DealerSummary } from '@/lib/types.ts';
import { CLEAR_CLS, INPUT_CLS, SELECT_CLS } from '@/features/adminOverview/constants/styles.ts';

type Props = {
  dealersData: { dealers: DealerSummary[] } | null;
  onDealersChanged?: () => void;
  onUsersChanged?: () => void;
};

const USER_PAGE_SIZE = 20;

export function UsersTab({ dealersData, onDealersChanged, onUsersChanged }: Props) {
  const allDealers = useMemo(() => dealersData?.dealers ?? [], [dealersData]);

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userPage, setUserPage] = useState(1);

  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersResult, setUsersResult] = useState<{
    users: OperatorUserSummary[];
    pagination: { total: number; page: number; limit: number; pages: number };
  } | null>(null);

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserRole, setCreateUserRole] = useState<OperatorUserRole>('OPERATOR');
  const [createUserEmail, setCreateUserEmail] = useState('');
  const [createUserDealerIds, setCreateUserDealerIds] = useState<string[]>([]);
  const [createUserErr, setCreateUserErr] = useState<string | null>(null);
  const [createUserBusy, setCreateUserBusy] = useState(false);

  const [pwCallout, setPwCallout] = useState<{ email: string; password: string } | null>(null);
  const [rowBusy, setRowBusy] = useState<Record<string, string>>({});
  const [confirmRow, setConfirmRow] = useState<{ userId: string; action: 'delete' | 'suspend' | 'reset' } | null>(null);

  const [accessUser, setAccessUser] = useState<OperatorUserSummary | null>(null);
  const [accessDealerIds, setAccessDealerIds] = useState<string[]>([]);
  const [accessBusy, setAccessBusy] = useState(false);
  const [accessErr, setAccessErr] = useState<string | null>(null);
  const [showAccessDealerCreate, setShowAccessDealerCreate] = useState(false);

  const loadUsers = useCallback(async (page: number, q: string, role: string) => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const result = await fetchAdminUsers({ q: q || undefined, role: role || undefined, page, limit: USER_PAGE_SIZE });
      setUsersResult(result);
    } catch (err: unknown) {
      setUsersError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers(1, '', '');
  }, [loadUsers]);

  function handleUserSearch(q: string, role: string, page: number) {
    setUserSearch(q);
    setUserRoleFilter(role);
    setUserPage(page);
    void loadUsers(page, q, role);
  }

  async function handleCreateUser() {
    const email = createUserEmail.trim().toLowerCase();
    if (!email) {
      setCreateUserErr('Email is required');
      return;
    }
    setCreateUserBusy(true);
    setCreateUserErr(null);
    try {
      const res = await createAdminUser({
        email,
        role: createUserRole,
        dealerAccessIds: createUserRole === 'SUPER_ADMIN' ? [] : createUserDealerIds,
      });
      setUsersResult(null);
      void loadUsers(userPage, userSearch, userRoleFilter);
      onUsersChanged?.();
      setShowCreateUser(false);
      setCreateUserEmail('');
      setCreateUserRole('OPERATOR');
      setCreateUserDealerIds([]);
      if (res.plainPassword) setPwCallout({ email: res.user.email, password: res.plainPassword });
    } catch (err: unknown) {
      setCreateUserErr(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreateUserBusy(false);
    }
  }

  function patchUserInList(updated: OperatorUserSummary) {
    setUsersResult(prev =>
      prev ? { ...prev, users: prev.users.map(user => user.id === updated.id ? updated : user) } : prev
    );
    setAccessUser(current => current?.id === updated.id ? updated : current);
  }

  function toggleCreateUserDealer(dealerId: string) {
    setCreateUserDealerIds(ids =>
      ids.includes(dealerId) ? ids.filter(id => id !== dealerId) : [...ids, dealerId]
    );
  }

  function openAccessModal(user: OperatorUserSummary) {
    setAccessUser(user);
    setAccessDealerIds(user.dealerAccess.map(dealer => dealer.id));
    setAccessErr(null);
    setShowAccessDealerCreate(false);
  }

  function toggleAccessDealer(dealerId: string) {
    setAccessDealerIds(ids =>
      ids.includes(dealerId) ? ids.filter(id => id !== dealerId) : [...ids, dealerId]
    );
  }

  async function saveUserAccess() {
    if (!accessUser) return;
    setAccessBusy(true);
    setAccessErr(null);
    try {
      const res = await updateAdminUser(accessUser.id, { dealerAccessIds: accessDealerIds });
      patchUserInList(res.user);
      onUsersChanged?.();
      setAccessUser(null);
    } catch (err) {
      setAccessErr(err instanceof Error ? err.message : 'Failed to update dealership access');
    } finally {
      setAccessBusy(false);
    }
  }

  async function handleSuspendUser(userId: string) {
    setRowBusy(busy => ({ ...busy, [userId]: 'suspend' }));
    setConfirmRow(null);
    try {
      const res = await updateAdminUser(userId, { isActive: false });
      patchUserInList(res.user);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to suspend user');
    } finally {
      setRowBusy(busy => { const next = { ...busy }; delete next[userId]; return next; });
    }
  }

  async function handleReinstateUser(userId: string) {
    setRowBusy(busy => ({ ...busy, [userId]: 'reinstate' }));
    setConfirmRow(null);
    try {
      const res = await updateAdminUser(userId, { isActive: true });
      patchUserInList(res.user);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to reinstate user');
    } finally {
      setRowBusy(busy => { const next = { ...busy }; delete next[userId]; return next; });
    }
  }

  async function handleResetPassword(userId: string, email: string) {
    setRowBusy(busy => ({ ...busy, [userId]: 'reset' }));
    setConfirmRow(null);
    try {
      const res = await updateAdminUser(userId, { resetPassword: true });
      patchUserInList(res.user);
      if (res.plainPassword) setPwCallout({ email, password: res.plainPassword });
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setRowBusy(busy => { const next = { ...busy }; delete next[userId]; return next; });
    }
  }

  async function handleDeleteUser(userId: string) {
    setRowBusy(busy => ({ ...busy, [userId]: 'delete' }));
    setConfirmRow(null);
    try {
      await deleteAdminUser(userId);
      setUsersResult(prev =>
        prev ? {
          ...prev,
          users: prev.users.filter(user => user.id !== userId),
          pagination: { ...prev.pagination, total: prev.pagination.total - 1 },
        } : prev
      );
      onUsersChanged?.();
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setRowBusy(busy => { const next = { ...busy }; delete next[userId]; return next; });
    }
  }

  return (
    <>
      {showCreateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-silver-200 bg-surface-card p-6 shadow-elevation-3">
            <h2 className="text-base font-bold text-ink-heading mb-1">Create Operator Account</h2>
            <p className="text-xs text-ink-faint mb-5">A secure password will be generated and shown once. Share it with the new user out-of-band.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">Email address</label>
                <input
                  type="email"
                  value={createUserEmail}
                  onChange={event => setCreateUserEmail(event.target.value)}
                  onKeyDown={event => event.key === 'Enter' && void handleCreateUser()}
                  placeholder="user@example.com"
                  className={`${INPUT_CLS} w-full`}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">Role</label>
                <select
                  value={createUserRole}
                  onChange={event => setCreateUserRole(event.target.value as OperatorUserRole)}
                  className={`${SELECT_CLS} w-full`}
                >
                  <option value="SUPER_ADMIN">Super Admin — full platform access</option>
                  <option value="OPERATOR">Operator — scoped to assigned dealerships</option>
                </select>
              </div>
              {createUserRole !== 'SUPER_ADMIN' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-ink-muted">Dealership access</label>
                    <span className="text-[10px] text-ink-faint">{createUserDealerIds.length} selected</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-md border border-silver-200 bg-surface-inset p-2 space-y-1">
                    {allDealers.map(dealer => (
                      <label key={dealer.id} className="flex items-center gap-2 px-2 py-1.5 text-xs text-ink-body rounded hover:bg-surface-card">
                        <input
                          type="checkbox"
                          checked={createUserDealerIds.includes(dealer.id)}
                          onChange={() => toggleCreateUserDealer(dealer.id)}
                        />
                        <span className="font-medium">{dealer.legalName}</span>
                      </label>
                    ))}
                    {allDealers.length === 0 && (
                      <p className="px-2 py-4 text-center text-xs text-ink-faint">Create a dealership first, then assign access.</p>
                    )}
                  </div>
                </div>
              )}
              {createUserErr && (
                <p className="text-xs text-status-error-text bg-status-error-bg border border-status-error-border rounded px-3 py-2">{createUserErr}</p>
              )}
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCreateUser(false); setCreateUserEmail(''); setCreateUserDealerIds([]); setCreateUserErr(null); }}
                  className={CLEAR_CLS}
                  disabled={createUserBusy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateUser()}
                  disabled={createUserBusy}
                  className="px-4 py-1.5 text-xs font-semibold bg-navy-800 hover:bg-navy-700 text-silver-100 rounded-md transition-colors disabled:opacity-40"
                >
                  {createUserBusy ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {accessUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-silver-200 bg-surface-card p-6 shadow-elevation-3">
            {showAccessDealerCreate ? (
              <DealershipIntakeFlow
                mode="admin"
                onSubmit={createAdminDealership}
                onUploadLogo={uploadDealerLogo}
                onComplete={response => {
                  setAccessDealerIds(ids => [...new Set([...ids, response.dealer.id])]);
                  setShowAccessDealerCreate(false);
                  onDealersChanged?.();
                }}
                onCancel={() => setShowAccessDealerCreate(false)}
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-ink-heading">Manage Dealership Access</h2>
                  <p className="text-xs text-ink-faint mt-1">{accessUser.email}</p>
                </div>
                {accessErr && (
                  <p className="text-xs text-status-error-text bg-status-error-bg border border-status-error-border rounded px-3 py-2">{accessErr}</p>
                )}
                {accessUser.role === 'SUPER_ADMIN' ? (
                  <div className="rounded-md border border-status-info-border bg-status-info-bg px-3 py-3 text-sm text-status-info-text">
                    Super admins have global dealership access and do not need scoped assignments.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-faint">{accessDealerIds.length} dealership{accessDealerIds.length !== 1 ? 's' : ''} selected</span>
                      <button
                        type="button"
                        onClick={() => setShowAccessDealerCreate(true)}
                        className="px-3 py-1.5 text-xs font-semibold bg-surface-card hover:bg-surface-inset text-ink-heading border border-silver-300 hover:border-silver-400 rounded-md transition-all"
                      >
                        Add New Dealership
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto rounded-md border border-silver-200 bg-surface-inset p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                      {allDealers.map(dealer => (
                        <label key={dealer.id} className="flex items-start gap-2 px-2 py-2 text-xs text-ink-body rounded hover:bg-surface-card">
                          <input
                            type="checkbox"
                            checked={accessDealerIds.includes(dealer.id)}
                            onChange={() => toggleAccessDealer(dealer.id)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="block font-semibold text-ink-heading">{dealer.legalName}</span>
                            <span className="block text-[10px] text-ink-faint font-mono">{dealer.id}</span>
                          </span>
                        </label>
                      ))}
                      {allDealers.length === 0 && (
                        <p className="md:col-span-2 px-2 py-8 text-center text-xs text-ink-faint">No dealerships exist yet.</p>
                      )}
                    </div>
                  </>
                )}
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setAccessUser(null)}
                    className={CLEAR_CLS}
                    disabled={accessBusy}
                  >
                    Cancel
                  </button>
                  {accessUser.role !== 'SUPER_ADMIN' && (
                    <button
                      type="button"
                      onClick={() => void saveUserAccess()}
                      disabled={accessBusy}
                      className="px-4 py-1.5 text-xs font-semibold bg-navy-800 hover:bg-navy-700 text-silver-100 rounded-md transition-colors disabled:opacity-40"
                    >
                      {accessBusy ? 'Saving...' : 'Save Access'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-silver-200 bg-surface-card p-6 shadow-elevation-3">
            <h2 className="text-base font-bold text-ink-heading mb-2">
              {confirmRow.action === 'delete' ? 'Delete Account' :
               confirmRow.action === 'suspend' ? 'Suspend Account' :
               'Reset Password'}
            </h2>
            <p className="text-sm text-ink-muted mb-5">
              {confirmRow.action === 'delete' ? 'This will permanently delete the account and all its sessions. This action cannot be undone.' :
               confirmRow.action === 'suspend' ? 'The user will be immediately logged out and unable to sign in until reinstated.' :
               'This will invalidate the current password and all active sessions. A new password will be shown once.'}
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setConfirmRow(null)} className={CLEAR_CLS}>Cancel</button>
              <button
                type="button"
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  confirmRow.action === 'delete'
                    ? 'bg-status-error-bg text-status-error-text hover:bg-red-100 border border-status-error-border'
                    : confirmRow.action === 'suspend'
                    ? 'bg-status-warning-bg text-status-warning-text hover:bg-amber-100 border border-status-warning-border'
                    : 'bg-navy-800 hover:bg-navy-700 text-silver-100'
                }`}
                onClick={() => {
                  const { userId, action } = confirmRow;
                  const user = usersResult?.users.find(row => row.id === userId);
                  if (action === 'delete') void handleDeleteUser(userId);
                  if (action === 'suspend') void handleSuspendUser(userId);
                  if (action === 'reset') void handleResetPassword(userId, user?.email ?? '');
                }}
              >
                {confirmRow.action === 'delete' ? 'Delete' : confirmRow.action === 'suspend' ? 'Suspend' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {pwCallout && (
          <div className="relative rounded-lg border border-status-success-border bg-status-success-bg px-5 py-4">
            <button
              type="button"
              onClick={() => setPwCallout(null)}
              className="absolute top-3 right-3 text-ink-faint hover:text-ink-heading text-lg leading-none"
              aria-label="Dismiss"
            >✕</button>
            <p className="text-xs font-bold text-status-success-text mb-1 uppercase tracking-wide">Account ready — copy credentials now</p>
            <p className="text-sm text-ink-heading font-medium mb-3">{pwCallout.email}</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-surface-card border border-silver-300 rounded px-3 py-2 text-sm font-mono text-ink-heading select-all">
                {pwCallout.password}
              </code>
              <button
                type="button"
                onClick={() => { void navigator.clipboard.writeText(pwCallout.password); }}
                className="px-3 py-2 text-xs font-semibold bg-navy-800 hover:bg-navy-700 text-silver-100 rounded-md transition-colors shrink-0"
              >
                Copy
              </button>
            </div>
            <p className="text-[10px] text-status-success-text mt-2">This password is shown once and cannot be retrieved after dismissal. Share it with the user securely.</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={userSearch}
            onChange={event => handleUserSearch(event.target.value, userRoleFilter, 1)}
            placeholder="Search email…"
            className={`${INPUT_CLS} w-48`}
          />
          <select
            value={userRoleFilter}
            onChange={event => handleUserSearch(userSearch, event.target.value, 1)}
            className={SELECT_CLS}
          >
            <option value="">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="OPERATOR">Operator</option>
            <option value="DEALER_OPERATOR">Dealer Operator</option>
          </select>
          {(userSearch || userRoleFilter) && (
            <button type="button" onClick={() => handleUserSearch('', '', 1)} className={CLEAR_CLS}>
              Clear
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => { setCreateUserRole('OPERATOR'); setShowCreateUser(true); }}
              className="px-3 py-1.5 text-xs font-semibold bg-surface-card hover:bg-surface-inset text-ink-heading border border-silver-300 hover:border-silver-400 rounded-md transition-all"
            >
              + Dealership User
            </button>
            <button
              type="button"
              onClick={() => { setCreateUserRole('SUPER_ADMIN'); setShowCreateUser(true); }}
              className="px-3 py-1.5 text-xs font-semibold bg-navy-800 hover:bg-navy-700 text-silver-100 rounded-md transition-colors"
            >
              + Add Admin
            </button>
          </div>
        </div>

        {usersLoading && !usersResult && (
          <div className="surface-card-operator p-5"><Skeleton rows={8} /></div>
        )}
        {usersError && <ErrorState message={usersError} />}

        {usersResult && (
          <>
            <p className="text-xs text-ink-faint">
              {usersResult.pagination.total} user{usersResult.pagination.total !== 1 ? 's' : ''}
              {(userSearch || userRoleFilter) ? ' matching filters' : ''}
            </p>
            <div className="surface-card-operator overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[860px]">
                <thead>
                  <tr className="bg-silver-100 border-b border-silver-200 text-[10px] text-ink-muted uppercase tracking-wider">
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Dealership Access</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold">Last Login</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersResult.users.map(user => {
                    const busy = rowBusy[user.id];
                    const ROLE_CFG: Record<string, { label: string; cls: string }> = {
                      SUPER_ADMIN: { label: 'Super Admin', cls: 'bg-status-info-bg text-status-info-text border-status-info-border' },
                      OPERATOR: { label: 'Operator', cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border' },
                      DEALER_OPERATOR: { label: 'Dealer Operator', cls: 'bg-surface-inset text-ink-muted border-silver-200' },
                    };
                    const roleCfg = ROLE_CFG[user.role] ?? ROLE_CFG['OPERATOR'];
                    return (
                      <tr key={user.id} className={`border-b border-silver-200 last:border-0 transition-colors ${
                        busy ? 'opacity-60' : 'hover:bg-surface-inset'
                      }`}>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-ink-heading">{user.email}</span>
                          <div className="text-[10px] text-ink-faint font-mono mt-0.5">{user.id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${roleCfg.cls}`}>
                            {roleCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {user.isActive ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-status-success-bg text-status-success-text border-status-success-border">Active</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-status-error-bg text-status-error-text border-status-error-border">Suspended</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {user.role === 'SUPER_ADMIN' ? (
                            <span className="text-[10px] text-ink-faint">Global access</span>
                          ) : user.dealerAccess.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.dealerAccess.slice(0, 2).map(dealer => (
                                <span key={dealer.id} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-inset text-ink-muted border border-silver-200">
                                  {dealer.legalName}
                                </span>
                              ))}
                              {user.dealerAccess.length > 2 && (
                                <span className="text-[10px] text-ink-faint">+{user.dealerAccess.length - 2}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-status-warning-text">No dealerships</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-muted font-mono whitespace-nowrap">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-muted font-mono whitespace-nowrap">
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : <span className="text-ink-faint">Never</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 flex-wrap">
                            <button
                              type="button"
                              disabled={!!busy}
                              onClick={() => openAccessModal(user)}
                              className="px-2.5 py-1 text-[10px] font-semibold text-navy-700 hover:text-navy-600 border border-silver-300 hover:border-silver-400 rounded transition-all disabled:opacity-40"
                            >
                              Access
                            </button>
                            {user.isActive ? (
                              <button
                                type="button"
                                disabled={!!busy}
                                onClick={() => setConfirmRow({ userId: user.id, action: 'suspend' })}
                                className="px-2.5 py-1 text-[10px] font-semibold text-status-warning-text hover:text-amber-700 border border-status-warning-border hover:border-amber-400 rounded transition-all disabled:opacity-40"
                              >
                                {busy === 'suspend' ? '…' : 'Suspend'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={!!busy}
                                onClick={() => void handleReinstateUser(user.id)}
                                className="px-2.5 py-1 text-[10px] font-semibold text-status-success-text hover:text-green-700 border border-status-success-border hover:border-green-400 rounded transition-all disabled:opacity-40"
                              >
                                {busy === 'reinstate' ? '…' : 'Reinstate'}
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={!!busy}
                              onClick={() => setConfirmRow({ userId: user.id, action: 'reset' })}
                              className="px-2.5 py-1 text-[10px] font-semibold text-ink-muted hover:text-ink-heading border border-silver-300 hover:border-silver-400 rounded transition-all disabled:opacity-40"
                            >
                              {busy === 'reset' ? '…' : 'Reset PW'}
                            </button>
                            <button
                              type="button"
                              disabled={!!busy}
                              onClick={() => setConfirmRow({ userId: user.id, action: 'delete' })}
                              className="px-2.5 py-1 text-[10px] font-semibold text-status-error-text hover:text-red-700 border border-status-error-border hover:border-red-400 rounded transition-all disabled:opacity-40"
                            >
                              {busy === 'delete' ? '…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {usersResult.users.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-faint text-sm">No users match the search criteria.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {usersResult.pagination.pages > 1 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-faint">
                  Page {usersResult.pagination.page} of {usersResult.pagination.pages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={userPage <= 1 || usersLoading}
                    onClick={() => handleUserSearch(userSearch, userRoleFilter, userPage - 1)}
                    className="px-3 py-1.5 font-semibold text-ink-muted hover:text-ink-heading border border-silver-300 hover:border-silver-400 rounded-md transition-all disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <button
                    type="button"
                    disabled={userPage >= usersResult.pagination.pages || usersLoading}
                    onClick={() => handleUserSearch(userSearch, userRoleFilter, userPage + 1)}
                    className="px-3 py-1.5 font-semibold text-ink-muted hover:text-ink-heading border border-silver-300 hover:border-silver-400 rounded-md transition-all disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
