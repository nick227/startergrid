import { useCallback, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { ErrorState, SectionCard } from '@/components/operator/index.ts';
import { adminDealerHash, adminPlatformHash } from '@/lib/routes.ts';
import { BUSINESS_CATEGORY_IDS } from '@auto-dealer/category-schemas';
import {
  type AdminDashboardResponse,
  fetchPlatformCredentials,
  validatePlatformCredentials,
  type ProviderCredentialResult,
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  type OperatorUserSummary,
  type OperatorUserRole,
} from '@/lib/api/admin.ts';
import { createAdminDealership, uploadDealerLogo } from '@/lib/api/sdk.ts';
import type { CreateDealershipResponse, DealerSummary } from '@/lib/types.ts';
import { DealerDashboard } from '@/components/dashboard';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { DealerTriagePanel } from '@/components/admin/DealerTriagePanel.tsx';
import { DealershipIntakeFlow } from '@/components/dealers/DealershipIntakeFlow.tsx';

// ── Types ─────────────────────────────────────────────────────────────────────

type AdminOverviewTab = 'system' | 'dealers' | 'platforms' | 'triage' | 'audit' | 'insights' | 'users';
type SortDir = 'asc' | 'desc';
type DealerSortField = 'legalName' | 'businessCategory' | 'createdAt' | 'issues';
type PlatSortField   = 'platformName' | 'dealersUsing' | 'maturity';

// ── Shared form-element class strings ────────────────────────────────────────

const INPUT_CLS =
  'bg-surface-card border border-silver-300 rounded-md px-3 py-1.5 text-xs text-ink-heading ' +
  'placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-navy-500/30 transition-colors';

const SELECT_CLS =
  'bg-surface-card border border-silver-300 rounded-md px-3 py-1.5 text-xs text-ink-heading ' +
  'focus:outline-none focus:ring-2 focus:ring-navy-500/30 transition-colors cursor-pointer';

const CLEAR_CLS =
  'px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink-heading ' +
  'border border-silver-300 hover:border-silver-400 rounded-md transition-all';

// ── Lookup tables ─────────────────────────────────────────────────────────────

const MATURITY_ORDER: Record<string, number> = { PRODUCTION_READY: 0, BETA: 1, ALPHA: 2 };

function formatDuration(sec: number | null): string {
  if (sec === null) return 'N/A';
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

const HEALTH_CFG: Record<string, { label: string; cls: string }> = {
  healthy:   { label: 'Healthy',    cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  flowing:   { label: 'Flowing',    cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  valid:     { label: 'Valid',      cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  backed_up: { label: 'Backed Up', cls: 'bg-status-warning-bg text-status-warning-text border-status-warning-border' },
  invalid:   { label: 'Invalid',   cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
  unhealthy: { label: 'Unhealthy', cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
  unknown:   { label: 'Not Checked', cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border' },
};
const HEALTH_DEFAULT = { label: 'Unknown', cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border' };

const READINESS_CFG: Record<string, { label: string; cls: string }> = {
  valid:   { label: 'Pass',    cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  PASS:    { label: 'Pass',    cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  WARNING: { label: 'Warning', cls: 'bg-status-warning-bg text-status-warning-text border-status-warning-border' },
  UNKNOWN: { label: 'Unknown', cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border' },
  invalid: { label: 'Fail',   cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
};
const READINESS_DEFAULT = { label: 'Unknown', cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border' };

const VALIDATION_CFG: Record<string, { label: string; cls: string }> = {
  valid:            { label: 'Valid',          cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  invalid:          { label: 'Invalid',        cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
  'not-configured': { label: 'Not Configured', cls: 'bg-surface-inset text-ink-faint border-silver-200' },
  unsupported:      { label: 'No Live Check',  cls: 'bg-surface-inset text-ink-faint border-silver-200' },
};
const VALIDATION_DEFAULT = { label: 'Not Checked', cls: 'bg-surface-inset text-ink-faint border-silver-200' };

const CAP_CLS = 'bg-surface-inset text-ink-muted border border-silver-200';

const MATURITY_CFG: Record<string, { label: string; cls: string }> = {
  PRODUCTION_READY: { label: 'Production Ready', cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  BETA:             { label: 'Beta',              cls: 'bg-status-info-bg text-status-info-text border-status-info-border' },
  ALPHA:            { label: 'Alpha',             cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border' },
};
const MATURITY_DEFAULT = { label: 'Unknown', cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border' };

// ── Reusable sortable column header ──────────────────────────────────────────

function SortTh({
  isActive,
  dir,
  onClick,
  children,
  className = '',
}: {
  isActive: boolean;
  dir: SortDir;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-4 py-3 font-semibold ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1 whitespace-nowrap hover:text-ink-heading transition-colors"
      >
        {children}
        <span className={`text-[9px] ${isActive ? 'text-orange-600' : 'text-silver-300'}`}>
          {isActive ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  );
}

// ── Results count line ────────────────────────────────────────────────────────

function ResultCount({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  return (
    <p className="text-xs text-ink-faint">
      {shown === total
        ? `${total} ${noun}${total !== 1 ? 's' : ''}`
        : `${shown} of ${total} ${noun}${total !== 1 ? 's' : ''}`}
    </p>
  );
}

// ── Page component ────────────────────────────────────────────────────────────

type Props = {
  activeTab: AdminOverviewTab;
  data: AdminDashboardResponse | null;
  loading: boolean;
  error: string | null;
  dealersData: { dealers: DealerSummary[] } | null;
  dealersLoading: boolean;
  dealersError: string | null;
  onDealersChanged?: () => void;
  onUsersChanged?: () => void;
};

type PlatformOverviewItemWithCategories = AdminDashboardResponse['platformOverview'][number] & {
  supportedCategories?: string[];
};

export default function AdminOverviewPage({
  activeTab,
  data,
  loading,
  error,
  dealersData,
  dealersLoading,
  dealersError,
  onDealersChanged,
  onUsersChanged,
}: Props) {
  const tab = activeTab;
  const [showAddDealer, setShowAddDealer] = useState(false);

  // Dealers tab
  const [dealerSearch, setDealerSearch]           = useState('');
  const [dealerCategory, setDealerCategory]       = useState('');
  const [dealerSort, setDealerSort]               = useState<DealerSortField>('legalName');
  const [dealerDir, setDealerDir]                 = useState<SortDir>('asc');

  // Platforms tab
  const [platSearch, setPlatSearch]               = useState('');
  const [platCap, setPlatCap]                     = useState('');
  const [platCategory, setPlatCategory]           = useState('');
  const [platValidation, setPlatValidation]       = useState('');
  const [platMaturity, setPlatMaturity]           = useState('');
  const [platSort, setPlatSort]                   = useState<PlatSortField>('platformName');
  const [platDir, setPlatDir]                     = useState<SortDir>('asc');
  const [liveValidationMap, setLiveValidationMap] = useState<Map<string, ProviderCredentialResult> | null>(null);
  const [validating, setValidating]               = useState(false);
  const [validationMeta, setValidationMeta]       = useState<{ checkedAt: Date; durationMs: number } | null>(null);

  // Audit tab
  const [auditSearch, setAuditSearch]             = useState('');
  const [auditDir, setAuditDir]                   = useState<SortDir>('desc');

  // ── Users tab state ─────────────────────────────────────────────────────
  const [userSearch, setUserSearch]               = useState('');
  const [userRoleFilter, setUserRoleFilter]       = useState('');
  const [userPage, setUserPage]                   = useState(1);
  const USER_PAGE_SIZE = 20;

  // Loaded users (managed locally so we can patch in-place without refetching whole page)
  const [usersLoading, setUsersLoading]           = useState(false);
  const [usersError, setUsersError]               = useState<string | null>(null);
  const [usersResult, setUsersResult]             = useState<{
    users: OperatorUserSummary[];
    pagination: { total: number; page: number; limit: number; pages: number };
  } | null>(null);

  // Create-user modal
  const [showCreateUser, setShowCreateUser]       = useState(false);
  const [createUserRole, setCreateUserRole]       = useState<OperatorUserRole>('OPERATOR');
  const [createUserEmail, setCreateUserEmail]     = useState('');
  const [createUserDealerIds, setCreateUserDealerIds] = useState<string[]>([]);
  const [createUserErr, setCreateUserErr]         = useState<string | null>(null);
  const [createUserBusy, setCreateUserBusy]       = useState(false);

  // Generated-password callout (shown after create OR reset)
  const [pwCallout, setPwCallout]                 = useState<{ email: string; password: string } | null>(null);

  // Inline row busy states: userId → action
  const [rowBusy, setRowBusy]                     = useState<Record<string, string>>({});

  // Confirmation: userId → action pending confirmation
  const [confirmRow, setConfirmRow]               = useState<{ userId: string; action: 'delete' | 'suspend' | 'reset' } | null>(null);

  // Dealership access management
  const [accessUser, setAccessUser]               = useState<OperatorUserSummary | null>(null);
  const [accessDealerIds, setAccessDealerIds]     = useState<string[]>([]);
  const [accessBusy, setAccessBusy]               = useState(false);
  const [accessErr, setAccessErr]                 = useState<string | null>(null);
  const [showAccessDealerCreate, setShowAccessDealerCreate] = useState(false);

  // ── Users data loader ──────────────────────────────────────────────────
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

  // Load on mount and whenever we enter the users tab
  const [userTabLoaded, setUserTabLoaded]         = useState(false);
  if (tab === 'users' && !userTabLoaded && !usersLoading && !usersResult) {
    setUserTabLoaded(true);
    void loadUsers(1, '', '');
  }

  // Dashboard shape
  const health          = useMemo(() => data?.health, [data]);
  const readiness       = useMemo(() => data?.readiness, [data]);
  const queueSnapshot   = useMemo(() => data?.queueSnapshot, [data]);
  const platformOverview = useMemo(
    () => (data?.platformOverview ?? []) as PlatformOverviewItemWithCategories[],
    [data],
  );
  const dealerAttention  = useMemo(() => data?.dealerAttention ?? [], [data]);
  const recentEvents     = useMemo(() => data?.recentEvents ?? [], [data]);

  const allDealers = useMemo(() => dealersData?.dealers ?? [], [dealersData]);

  // Triage map: dealerId → { critical, warning, info }
  const triageByDealer = useMemo(() => {
    const m: Record<string, { critical: number; warning: number; info: number }> = {};
    for (const item of dealerAttention) {
      if (!m[item.dealerId]) m[item.dealerId] = { critical: 0, warning: 0, info: 0 };
      const s = item.severity as 'critical' | 'warning' | 'info';
      if (s in m[item.dealerId]) m[item.dealerId][s]++;
    }
    return m;
  }, [dealerAttention]);

  const dealerIssueWeight = useCallback((id: string) => {
    const t = triageByDealer[id];
    return t ? t.critical * 100 + t.warning * 10 + t.info : 0;
  }, [triageByDealer]);

  const dealerCategories = useMemo(
    () => [...new Set(allDealers.map(d => d.businessCategory))].sort(),
    [allDealers],
  );

  // ── Filtered & sorted lists ────────────────────────────────────────────────

  const filteredDealers = useMemo(() => {
    let list = [...allDealers];
    if (dealerSearch) {
      const q = dealerSearch.toLowerCase();
      list = list.filter(d =>
        d.legalName.toLowerCase().includes(q) ||
        (d.dbaName?.toLowerCase().includes(q) ?? false) ||
        d.id.toLowerCase().includes(q),
      );
    }
    if (dealerCategory) list = list.filter(d => d.businessCategory === dealerCategory);
    list.sort((a, b) => {
      let cmp = 0;
      if (dealerSort === 'legalName')       cmp = a.legalName.localeCompare(b.legalName);
      else if (dealerSort === 'businessCategory') cmp = a.businessCategory.localeCompare(b.businessCategory);
      else if (dealerSort === 'createdAt')  cmp = a.createdAt.localeCompare(b.createdAt);
      else if (dealerSort === 'issues')     cmp = dealerIssueWeight(a.id) - dealerIssueWeight(b.id);
      return dealerDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [allDealers, dealerSearch, dealerCategory, dealerSort, dealerDir, dealerIssueWeight]);

  const filteredPlatforms = useMemo(() => {
    let list = [...platformOverview];
    if (platSearch) {
      const q = platSearch.toLowerCase();
      list = list.filter(p =>
        p.platformName.toLowerCase().includes(q) ||
        p.platformSlug.toLowerCase().includes(q),
      );
    }
    if (platCap)       list = list.filter(p => p.capabilities.includes(platCap));
    if (platCategory)  list = list.filter(p => p.supportedCategories?.includes(platCategory));
    if (platValidation) list = list.filter(p => p.liveValidationStatus === platValidation);
    if (platMaturity)  list = list.filter(p => p.integrationMaturity === platMaturity);
    list.sort((a, b) => {
      let cmp = 0;
      if (platSort === 'platformName')  cmp = a.platformName.localeCompare(b.platformName);
      else if (platSort === 'dealersUsing') cmp = a.dealersUsing - b.dealersUsing;
      else if (platSort === 'maturity') cmp = (MATURITY_ORDER[a.integrationMaturity ?? ''] ?? 3) - (MATURITY_ORDER[b.integrationMaturity ?? ''] ?? 3);
      return platDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [platformOverview, platSearch, platCap, platCategory, platValidation, platMaturity, platSort, platDir]);

  const filteredAudit = useMemo(() => {
    let list = [...recentEvents];
    if (auditSearch) {
      const q = auditSearch.toLowerCase();
      list = list.filter(e =>
        e.action.toLowerCase().includes(q) ||
        e.actorEmail.toLowerCase().includes(q) ||
        (e.detailString?.toLowerCase().includes(q) ?? false),
      );
    }
    list.sort((a, b) => {
      const cmp = a.createdAt.localeCompare(b.createdAt);
      return auditDir === 'desc' ? -cmp : cmp;
    });
    return list;
  }, [recentEvents, auditSearch, auditDir]);

  // ── Sort togglers ─────────────────────────────────────────────────────────

  function toggleDealer(f: DealerSortField) {
    if (dealerSort === f) setDealerDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setDealerSort(f); setDealerDir('asc'); }
  }
  function togglePlat(f: PlatSortField) {
    if (platSort === f) setPlatDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setPlatSort(f); setPlatDir('asc'); }
  }
  function toggleAudit() {
    setAuditDir(d => (d === 'asc' ? 'desc' : 'asc'));
  }

  // ── Derived counts ────────────────────────────────────────────────────────

  const dealerActiveFilters = [dealerSearch, dealerCategory].filter(Boolean).length;
  const platActiveFilters   = [platSearch, platCategory, platCap, platValidation, platMaturity].filter(Boolean).length;
  const auditActiveFilters  = [auditSearch].filter(Boolean).length;

  // ── Render ────────────────────────────────────────────────────────────────

  async function runValidation() {
    setValidating(true);
    try {
      const [valRes, credRes] = await Promise.all([
        validatePlatformCredentials(),
        fetchPlatformCredentials(),
      ]);
      const slugMap = new Map<string, ProviderCredentialResult>();
      for (const r of valRes.results) {
        const prov = credRes.providers.find(p => p.provider === r.provider);
        if (prov) prov.platformSlugs.forEach(s => slugMap.set(s, r));
      }
      setLiveValidationMap(slugMap);
      setValidationMeta({ checkedAt: new Date(), durationMs: valRes.meta?.durationMs ?? 0 });
    } finally {
      setValidating(false);
    }
  }

  function handleDealerCreated(response: CreateDealershipResponse) {
    setShowAddDealer(false);
    onDealersChanged?.();
    window.location.assign(response.nextHref);
  }

  // ── User action handlers ─────────────────────────────────────────────────

  async function handleCreateUser() {
    const email = createUserEmail.trim().toLowerCase();
    if (!email) { setCreateUserErr('Email is required'); return; }
    setCreateUserBusy(true);
    setCreateUserErr(null);
    try {
      const res = await createAdminUser({
        email,
        role: createUserRole,
        dealerAccessIds: createUserRole === 'SUPER_ADMIN' ? [] : createUserDealerIds,
      });
      setUsersResult(null); // force reload
      setUserTabLoaded(false);
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
      prev ? { ...prev, users: prev.users.map(u => u.id === updated.id ? updated : u) } : prev
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
    setAccessDealerIds(user.dealerAccess.map(d => d.id));
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
    setRowBusy(b => ({ ...b, [userId]: 'suspend' }));
    setConfirmRow(null);
    try {
      const res = await updateAdminUser(userId, { isActive: false });
      patchUserInList(res.user);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to suspend user');
    } finally {
      setRowBusy(b => { const n = { ...b }; delete n[userId]; return n; });
    }
  }

  async function handleReinstateUser(userId: string) {
    setRowBusy(b => ({ ...b, [userId]: 'reinstate' }));
    setConfirmRow(null);
    try {
      const res = await updateAdminUser(userId, { isActive: true });
      patchUserInList(res.user);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to reinstate user');
    } finally {
      setRowBusy(b => { const n = { ...b }; delete n[userId]; return n; });
    }
  }

  async function handleResetPassword(userId: string, email: string) {
    setRowBusy(b => ({ ...b, [userId]: 'reset' }));
    setConfirmRow(null);
    try {
      const res = await updateAdminUser(userId, { resetPassword: true });
      patchUserInList(res.user);
      if (res.plainPassword) setPwCallout({ email, password: res.plainPassword });
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setRowBusy(b => { const n = { ...b }; delete n[userId]; return n; });
    }
  }

  async function handleDeleteUser(userId: string) {
    setRowBusy(b => ({ ...b, [userId]: 'delete' }));
    setConfirmRow(null);
    try {
      await deleteAdminUser(userId);
      setUsersResult(prev =>
        prev ? { ...prev, users: prev.users.filter(u => u.id !== userId), pagination: { ...prev.pagination, total: prev.pagination.total - 1 } } : prev
      );
      onUsersChanged?.();
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setRowBusy(b => { const n = { ...b }; delete n[userId]; return n; });
    }
  }

  function handleUserSearch(q: string, role: string, page: number) {
    setUserSearch(q);
    setUserRoleFilter(role);
    setUserPage(page);
    void loadUsers(page, q, role);
  }

  return (
    <>
      {/* Create-user modal */}
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
                  onChange={e => setCreateUserEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void handleCreateUser()}
                  placeholder="user@example.com"
                  className={`${INPUT_CLS} w-full`}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">Role</label>
                <select
                  value={createUserRole}
                  onChange={e => setCreateUserRole(e.target.value as OperatorUserRole)}
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

      {/* Dealership access modal */}
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

      {/* Confirm action dialog */}
      {confirmRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-silver-200 bg-surface-card p-6 shadow-elevation-3">
            <h2 className="text-base font-bold text-ink-heading mb-2">
              {confirmRow.action === 'delete'  ? 'Delete Account' :
               confirmRow.action === 'suspend' ? 'Suspend Account' :
               'Reset Password'}
            </h2>
            <p className="text-sm text-ink-muted mb-5">
              {confirmRow.action === 'delete'  ? 'This will permanently delete the account and all its sessions. This action cannot be undone.' :
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
                  const user = usersResult?.users.find(u => u.id === userId);
                  if (action === 'delete')  void handleDeleteUser(userId);
                  if (action === 'suspend') void handleSuspendUser(userId);
                  if (action === 'reset')   void handleResetPassword(userId, user?.email ?? '');
                }}
              >
                {confirmRow.action === 'delete' ? 'Delete' : confirmRow.action === 'suspend' ? 'Suspend' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddDealer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-silver-200 bg-surface-card p-6 shadow-elevation-3">
            <DealershipIntakeFlow
              mode="admin"
              onSubmit={createAdminDealership}
              onUploadLogo={uploadDealerLogo}
              onComplete={handleDealerCreated}
              onCancel={() => setShowAddDealer(false)}
            />
          </div>
        </div>
      )}

      {loading && !data && (
        <div className="surface-card-operator p-6"><Skeleton rows={12} /></div>
      )}
      {error && <ErrorState message={error} />}

      {!loading && !error && data && (
        <>

          {/* ── System Status Tab ─────────────────────────────────────────── */}
          {tab === 'system' && (
            <div className="space-y-5">
              <SectionCard
                title="Health"
                subtitle="Live status of core infrastructure components powering this portal instance."
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'API Gateway',       value: 'healthy',                       hint: 'Request routing layer' },
                    { label: 'Database',          value: health?.db,                       hint: 'Primary data store' },
                    { label: 'Queue Flow',        value: health?.queue,                    hint: 'Sync and publish pipeline' },
                    { label: 'Credentials Cache', value: health?.credentials ?? 'unknown', hint: 'Platform API key store' },
                  ].map(item => {
                    const cfg = HEALTH_CFG[item.value ?? ''] ?? HEALTH_DEFAULT;
                    return (
                      <div key={item.label} className="bg-surface-inset border border-silver-200 rounded-md p-4">
                        <div className="text-xs font-semibold text-ink-heading mb-0.5">{item.label}</div>
                        <div className="text-[10px] text-ink-faint mb-2">{item.hint}</div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard
                title="Publish Queue"
                subtitle="Current state of the sync and publish pipeline. Failed and held items require manual review."
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Pending',               value: queueSnapshot?.pending,  color: 'text-ink-heading' },
                    { label: 'Retrying',              value: queueSnapshot?.retrying, color: 'text-status-warning-text' },
                    { label: 'Failed',                value: queueSnapshot?.failed,   color: 'text-status-error-text' },
                    { label: 'Held / Needs Approval', value: queueSnapshot?.held,     color: 'text-navy-700' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-surface-inset border border-silver-200 rounded-md p-4">
                      <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value ?? '—'}</div>
                      <div className="text-[10px] text-ink-muted uppercase tracking-wide font-semibold mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="px-4 py-3 bg-surface-inset border border-silver-200 rounded-md flex justify-between text-xs">
                    <span className="text-ink-muted">Oldest Pending Age</span>
                    <span className="font-mono text-ink-heading">{formatDuration(queueSnapshot?.oldestPendingAgeSec ?? null)}</span>
                  </div>
                  <div className="px-4 py-3 bg-surface-inset border border-silver-200 rounded-md flex justify-between text-xs">
                    <span className="text-ink-muted">Last Successful Sync</span>
                    <span className="font-mono text-ink-heading">
                      {queueSnapshot?.lastSuccessSyncAt
                        ? new Date(queueSnapshot.lastSuccessSyncAt).toLocaleTimeString()
                        : 'Never'}
                    </span>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Readiness Checklist"
                subtitle="Pre-flight validation across core subsystems. All checks should pass before onboarding new dealers."
                noPadding
              >
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-silver-100 border-b border-silver-200 text-[10px] text-ink-muted uppercase tracking-wider">
                        <th className="px-4 py-3 text-left font-semibold">Subsystem</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">What it checks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Platform Registry', value: readiness?.platformRegistry, desc: 'All known platforms are registered and resolvable by slug.' },
                        { label: 'Sync Bridges',      value: readiness?.bridges,          desc: 'Catalog and social sync bridge adapters are initialized.' },
                        { label: 'OAuth Clients',     value: readiness?.oauthClients,     desc: 'OAuth provider client configurations are loaded and valid.' },
                        { label: 'Category Schemas',  value: readiness?.categorySchemas,  desc: 'Vehicle category field schemas are defined and consistent.' },
                        { label: 'Geo Coordinates',   value: readiness?.geoCoordinates,   desc: 'Rooftop geocoordinates are available for at least one dealer.' },
                        { label: 'Marketplace Smoke', value: readiness?.smokeMarketplace, desc: 'Marketplace listing data pathway responds successfully.' },
                        { label: 'Operator Smoke',    value: readiness?.smokeOperator,    desc: 'Operator console data path is accessible and returns results.' },
                      ].map(check => {
                        const cfg = READINESS_CFG[check.value ?? ''] ?? READINESS_DEFAULT;
                        return (
                          <tr key={check.label} className="border-b border-silver-200 last:border-0 hover:bg-surface-inset transition-colors">
                            <td className="px-4 py-3 text-sm text-ink-heading font-medium">{check.label}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${cfg.cls}`}>
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-ink-faint hidden md:table-cell">{check.desc}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

            </div>
          )}

          {/* ── Dealerships Tab ────────────────────────────────────────────── */}
          {tab === 'dealers' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={dealerSearch}
                  onChange={e => setDealerSearch(e.target.value)}
                  placeholder="Search name or ID…"
                  className={`${INPUT_CLS} w-48`}
                />
                <select value={dealerCategory} onChange={e => setDealerCategory(e.target.value)} className={SELECT_CLS}>
                  <option value="">All Categories</option>
                  {dealerCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                {dealerActiveFilters > 0 && (
                  <button type="button" onClick={() => { setDealerSearch(''); setDealerCategory(''); }} className={CLEAR_CLS}>
                    Clear ({dealerActiveFilters})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAddDealer(true)}
                  className="px-3 py-1.5 text-xs font-semibold bg-navy-800 hover:bg-navy-700 text-silver-100 rounded-md transition-colors"
                >
                  Add Dealership
                </button>
                {Object.keys(triageByDealer).length > 0 && (
                  <span className="ml-auto text-xs text-status-warning-text">
                    {Object.keys(triageByDealer).length} with open issues
                  </span>
                )}
              </div>

              {dealersLoading && !dealersData && (
                <div className="surface-card-operator p-5"><Skeleton rows={8} /></div>
              )}
              {dealersError && <ErrorState message={dealersError} />}

              {!dealersLoading && !dealersError && (
                <>
                  <ResultCount shown={filteredDealers.length} total={allDealers.length} noun="dealership" />
                  <div className="surface-card-operator overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[680px]">
                      <thead>
                        <tr className="bg-silver-100 border-b border-silver-200 text-[10px] text-ink-muted uppercase tracking-wider">
                          <SortTh isActive={dealerSort === 'legalName'}       dir={dealerDir} onClick={() => toggleDealer('legalName')}>Dealership</SortTh>
                          <SortTh isActive={dealerSort === 'businessCategory'} dir={dealerDir} onClick={() => toggleDealer('businessCategory')}>Category</SortTh>
                          <SortTh isActive={dealerSort === 'createdAt'}       dir={dealerDir} onClick={() => toggleDealer('createdAt')}>Member Since</SortTh>
                          <SortTh isActive={dealerSort === 'issues'}          dir={dealerDir} onClick={() => toggleDealer('issues')}>Open Issues</SortTh>
                          <th className="px-4 py-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDealers.map(dealer => {
                          const triage = triageByDealer[dealer.id];
                          return (
                            <tr key={dealer.id} className="border-b border-silver-200 last:border-0 hover:bg-surface-inset transition-colors">
                              <td className="px-4 py-3">
                                <a href={adminDealerHash(dealer.id)} className="font-semibold text-navy-700 hover:text-navy-600 hover:underline text-sm">
                                  {dealer.legalName}
                                </a>
                                {dealer.dbaName && dealer.dbaName !== dealer.legalName && (
                                  <div className="text-[11px] text-ink-muted mt-0.5">dba {dealer.dbaName}</div>
                                )}
                                <div className="text-[10px] text-ink-faint font-mono mt-0.5">{dealer.id}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-status-neutral-bg text-status-neutral-text border border-status-neutral-border">
                                  {dealer.businessCategory}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-ink-muted font-mono whitespace-nowrap">
                                {new Date(dealer.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                {!triage ? (
                                  <span className="text-[10px] text-ink-faint">None</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {triage.critical > 0 && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-status-error-bg text-status-error-text border-status-error-border">
                                        {triage.critical} critical
                                      </span>
                                    )}
                                    {triage.warning > 0 && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-status-warning-bg text-status-warning-text border-status-warning-border">
                                        {triage.warning} warning
                                      </span>
                                    )}
                                    {triage.info > 0 && triage.critical === 0 && triage.warning === 0 && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-status-info-bg text-status-info-text border-status-info-border">
                                        {triage.info} info
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
                                  <a href={adminDealerHash(dealer.id)} className="px-2.5 py-1 text-[10px] font-semibold text-orange-600 hover:text-orange-500 border border-orange-100 hover:border-orange-100 rounded transition-all">Manage</a>
                                  <a href={`#/${dealer.id}/platforms`} className="px-2.5 py-1 text-[10px] font-semibold text-ink-muted hover:text-ink-heading border border-silver-300 hover:border-silver-400 rounded transition-all">Platforms</a>
                                  <a href={`#/${dealer.id}/inventory`} className="px-2.5 py-1 text-[10px] font-semibold text-ink-muted hover:text-ink-heading border border-silver-300 hover:border-silver-400 rounded transition-all">Inventory</a>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredDealers.length === 0 && (
                          <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-faint text-sm">No dealerships match the search criteria.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Platforms Tab ──────────────────────────────────────────────── */}
          {tab === 'platforms' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={platSearch}
                  onChange={e => setPlatSearch(e.target.value)}
                  placeholder="Search platforms…"
                  className={`${INPUT_CLS} w-44`}
                />
                <select value={platCategory} onChange={e => setPlatCategory(e.target.value)} className={SELECT_CLS}>
                  <option value="">All Categories</option>
                  {BUSINESS_CATEGORY_IDS.map(id => (
                    <option key={id} value={id}>{id.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                <select value={platCap} onChange={e => setPlatCap(e.target.value)} className={SELECT_CLS}>
                  <option value="">All Capabilities</option>
                  <option value="catalogSync">Catalog Sync</option>
                  <option value="socialPosting">Social Posting</option>
                  <option value="marketplaceListing">Marketplace Listing</option>
                  <option value="partnerFeed">Partner Feed</option>
                  <option value="leadCapture">Lead Capture</option>
                </select>
                <select value={platValidation} onChange={e => setPlatValidation(e.target.value)} className={SELECT_CLS}>
                  <option value="">All Validation States</option>
                  <option value="valid">Valid</option>
                  <option value="invalid">Invalid</option>
                  <option value="not-configured">Not Configured</option>
                  <option value="unsupported">No Live Check</option>
                </select>
                <select value={platMaturity} onChange={e => setPlatMaturity(e.target.value)} className={SELECT_CLS}>
                  <option value="">All Maturities</option>
                  <option value="PRODUCTION_READY">Production Ready</option>
                  <option value="BETA">Beta</option>
                  <option value="ALPHA">Alpha</option>
                </select>
                {platActiveFilters > 0 && (
                  <button type="button" onClick={() => { setPlatSearch(''); setPlatCategory(''); setPlatCap(''); setPlatValidation(''); setPlatMaturity(''); }} className={CLEAR_CLS}>
                    Clear ({platActiveFilters})
                  </button>
                )}
                <div className="ml-auto flex items-center gap-3">
                  {validationMeta && (
                    <span className="text-[10px] text-ink-faint">
                      Validated {validationMeta.checkedAt.toLocaleTimeString()} · {validationMeta.durationMs}ms
                    </span>
                  )}
                  {!validationMeta && filteredPlatforms.filter(p => p.liveValidationStatus === 'invalid').length > 0 && (
                    <span className="text-xs text-status-error-text">
                      {filteredPlatforms.filter(p => p.liveValidationStatus === 'invalid').length} invalid
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void runValidation()}
                    disabled={validating}
                    className="px-3 py-1.5 text-xs font-semibold bg-navy-800 hover:bg-navy-700 text-silver-100 rounded-md transition-colors disabled:opacity-40"
                  >
                    {validating ? 'Validating…' : 'Validate Credentials'}
                  </button>
                </div>
              </div>

              <ResultCount shown={filteredPlatforms.length} total={platformOverview.length} noun="platform" />

              <div className="surface-card-operator overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-silver-100 border-b border-silver-200 text-[10px] text-ink-muted uppercase tracking-wider">
                      <SortTh isActive={platSort === 'platformName'}  dir={platDir} onClick={() => togglePlat('platformName')}>Platform</SortTh>
                      <th className="px-4 py-3 font-semibold">Validation</th>
                      <th className="px-4 py-3 font-semibold">Capabilities</th>
                      <SortTh isActive={platSort === 'dealersUsing'} dir={platDir} onClick={() => togglePlat('dealersUsing')}>Dealers</SortTh>
                      <SortTh isActive={platSort === 'maturity'}     dir={platDir} onClick={() => togglePlat('maturity')}>Maturity</SortTh>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlatforms.map(p => {
                      const liveValidation = liveValidationMap?.get(p.platformSlug);
                      const valCfg = VALIDATION_CFG[liveValidation?.status ?? p.liveValidationStatus ?? ''] ?? VALIDATION_DEFAULT;
                      const matCfg = MATURITY_CFG[p.integrationMaturity ?? ''] ?? MATURITY_DEFAULT;
                      return (
                        <tr key={p.platformSlug} className="border-b border-silver-200 last:border-0 hover:bg-surface-inset transition-colors">
                          <td className="px-4 py-3">
                            <a href={adminPlatformHash(p.platformSlug)} className="font-semibold text-navy-700 hover:text-navy-600 hover:underline text-sm">
                              {p.platformName}
                            </a>
                            <div className="text-[10px] text-ink-faint font-mono mt-0.5">
                              {p.platformSlug}
                              {!p.configured && <span className="ml-1.5 text-ink-faint">· not configured</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${valCfg.cls}`}>{valCfg.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {p.capabilities.map(cap => (
                                <span key={cap} className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${CAP_CLS}`}>
                                  {cap}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-ink-heading text-sm">{p.dealersUsing}</span>
                            {p.blockedDealers > 0 && <div className="text-[10px] text-status-error-text font-semibold mt-0.5">{p.blockedDealers} blocked</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${matCfg.cls}`}>{matCfg.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredPlatforms.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-faint text-sm">No platforms match the selected filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Dealer Triage Tab ──────────────────────────────────────────── */}
          {tab === 'triage' && (
            <DealerTriagePanel />
          )}

          {/* ── Audit Log Tab ──────────────────────────────────────────────── */}
          {tab === 'audit' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  placeholder="Search action, actor, or details…"
                  className={`${INPUT_CLS} w-60`}
                />
                {auditActiveFilters > 0 && (
                  <button type="button" onClick={() => setAuditSearch('')} className={CLEAR_CLS}>
                    Clear
                  </button>
                )}
                <div className="ml-auto">
                  <button
                    type="button"
                    onClick={() => toggleAudit()}
                    className="px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink-heading border border-silver-300 hover:border-silver-400 rounded-md transition-all"
                  >
                    {auditDir === 'desc' ? 'Newest first ↓' : 'Oldest first ↑'}
                  </button>
                </div>
              </div>

              <ResultCount shown={filteredAudit.length} total={recentEvents.length} noun="event" />

              {filteredAudit.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-silver-200 rounded-md text-ink-faint text-sm">
                  No events match the search criteria.
                </div>
              ) : (
                <div className="surface-card-operator overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-silver-100 border-b border-silver-200 text-[10px] text-ink-muted uppercase tracking-wider">
                        <SortTh isActive={true} dir={auditDir} onClick={() => toggleAudit()} className="whitespace-nowrap">Timestamp</SortTh>
                        <th className="px-4 py-3 font-semibold">Action</th>
                        <th className="px-4 py-3 font-semibold">Actor</th>
                        <th className="px-4 py-3 font-semibold">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAudit.map(event => (
                        <tr key={event.id} className="border-b border-silver-200 last:border-0 hover:bg-surface-inset transition-colors align-top">
                          <td className="px-4 py-3 font-mono text-[10px] text-ink-faint whitespace-nowrap">
                            {new Date(event.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-ink-heading">{event.action}</td>
                          <td className="px-4 py-3 text-xs text-ink-muted">{event.actorEmail}</td>
                          <td className="px-4 py-3 text-[10px] text-ink-faint font-mono max-w-xs break-words leading-relaxed">
                            {event.detailString || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Insights Tab ────────────────────────────────────────────────── */}
          {tab === 'insights' && (
            <div className="space-y-4">
              <DealerDashboard 
                isAdmin={true} 
                nav={{
                  goToHome: () => { window.location.hash = '#/admin' },
                  goToPlatforms: () => { window.location.hash = '#/admin/platforms' },
                  goToQueue: () => {},
                  goToHistory: () => {},
                  goToReports: () => { window.location.hash = '#/admin/dealers' },
                  goToInventory: () => { window.location.hash = '#/admin/dealers' },
                  goToLeads: () => { window.location.hash = '#/admin/dealers' },
                  goToHelp: () => { window.location.hash = '#/admin/dealers' },
                  goToPlatformDetail: () => { window.location.hash = '#/admin/platforms' },
                  goToPlatformQueue: () => {},
                  goToPlatformHistory: () => {},
                  goToSync: () => {},
                  goToAccounts: () => {},
                  goToInsights: () => { window.location.hash = '#/admin/insights' },
                  goToKnowledge: () => {},
                  changeDealer: () => { window.location.hash = '#/admin/dealers' },
                } as OperatorNavHandlers} 
              />
            </div>
          )}

          {/* ── Users Tab ──────────────────────────────────────────────────── */}

        </>
      )}

      {/* Users tab renders outside the data guard so it can load independently */}
      {tab === 'users' && (
        <div className="space-y-4">

          {/* Password callout — shown after create or reset */}
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

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={userSearch}
              onChange={e => handleUserSearch(e.target.value, userRoleFilter, 1)}
              placeholder="Search email…"
              className={`${INPUT_CLS} w-48`}
            />
            <select
              value={userRoleFilter}
              onChange={e => handleUserSearch(userSearch, e.target.value, 1)}
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
                        SUPER_ADMIN:     { label: 'Super Admin',     cls: 'bg-status-info-bg text-status-info-text border-status-info-border' },
                        OPERATOR:        { label: 'Operator',        cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border' },
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
	                              {/* Suspend / Reinstate */}
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
                              {/* Reset Password */}
                              <button
                                type="button"
                                disabled={!!busy}
                                onClick={() => setConfirmRow({ userId: user.id, action: 'reset' })}
                                className="px-2.5 py-1 text-[10px] font-semibold text-ink-muted hover:text-ink-heading border border-silver-300 hover:border-silver-400 rounded transition-all disabled:opacity-40"
                              >
                                {busy === 'reset' ? '…' : 'Reset PW'}
                              </button>
                              {/* Delete */}
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

              {/* Pagination */}
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
      )}
    </>
  );
}
