import type { PlatformAccountEntry } from '../lib/types.ts';

type Props = {
  accounts: PlatformAccountEntry[];
  onManageAccounts?: () => void;
};

const ACCOUNT_STATE_STYLES: Record<string, string> = {
  ACTIVE:              'bg-green-100 text-green-700',
  PENDING_REVIEW:      'bg-blue-100 text-blue-700',
  CREDENTIALS_NEEDED:  'bg-amber-100 text-amber-700',
  ACCOUNT_NEEDED:      'bg-slate-100 text-slate-500',
  BLOCKED:             'bg-red-100 text-red-700',
  PARTNER_REQUIRED:    'bg-slate-100 text-slate-400',
  SUSPENDED:           'bg-red-100 text-red-600'
};

const APP_STATUS_STYLES: Record<string, string> = {
  ACTIVE:              'text-green-600',
  SUBMITTED:           'text-blue-600',
  APPROVED:            'text-emerald-600',
  NOT_STARTED:         'text-slate-400',
  PARTNER_REQUIRED:    'text-slate-400',
  REJECTED:            'text-red-600',
  PAUSED:              'text-amber-600'
};

export default function AccountsPanel({ accounts, onManageAccounts }: Props) {
  const active    = accounts.filter(a => a.accountState === 'ACTIVE').length;
  const needWork  = accounts.filter(a => ['BLOCKED', 'SUSPENDED', 'CREDENTIALS_NEEDED', 'ACCOUNT_NEEDED'].includes(a.accountState)).length;
  const blocking  = accounts.filter(a => a.accountState === 'BLOCKED' || a.accountState === 'SUSPENDED');

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Platform Accounts
          </h2>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-400">
              {active} active · {needWork} need setup
            </div>
            {onManageAccounts && (
              <button
                onClick={onManageAccounts}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Manage →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Blocking accounts callout */}
      {blocking.length > 0 && (
        <div className="px-5 py-2.5 bg-red-50 border-b border-red-100">
          <p className="text-xs text-red-700 font-medium mb-1">
            {blocking.length} platform{blocking.length !== 1 ? 's' : ''} blocked — publish will reflect this:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {blocking.map(a => (
              <span key={a.platformSlug} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded border border-red-200 font-mono">
                {a.platformName}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="max-h-72 overflow-y-auto scrollbar-thin divide-y divide-slate-50">
        {accounts.map(a => (
          <div
            key={a.platformSlug}
            className={`px-5 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors
              ${a.accountState === 'BLOCKED' || a.accountState === 'SUSPENDED' ? 'bg-red-50/30' : ''}`}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-800 truncate">{a.platformName}</div>
              {a.updatedAt && (
                <div className="text-xs text-slate-300 font-mono">
                  {new Date(a.updatedAt).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {a.applicationStatus && a.applicationStatus !== 'NOT_STARTED' && (
                <span className={`text-xs font-medium ${APP_STATUS_STYLES[a.applicationStatus] ?? 'text-slate-400'}`}>
                  {a.applicationStatus.toLowerCase().replace(/_/g, ' ')}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACCOUNT_STATE_STYLES[a.accountState] ?? 'bg-slate-100 text-slate-500'}`}>
                {a.accountState.toLowerCase().replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
