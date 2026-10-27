import { useAuth } from '@/contexts/AuthContext.tsx';
import { HelpButton } from '@/components/docs/HelpButton.tsx';
import { AppHeader } from './AppHeader.tsx';

type Props = {
  helpTopic?: string;
  nav?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
};

export function AdminShell({ nav, action, children, helpTopic = 'staff-dealership-assistance' }: Props) {
  const { user, logout } = useAuth();
  const workspaceLabel = user?.role === 'SUPER_ADMIN' ? 'Site administration' : 'Internal workspace';

  return (
    <div className="min-h-screen bg-surface-page">
      <AppHeader
        context={<p className="hidden truncate text-[11px] text-ink-faint sm:block">{workspaceLabel}</p>}
        end={(
          <div className="flex shrink-0 items-center gap-2">
            {action}
            <HelpButton topic={helpTopic} inverted />
            {user && (
              <>
                <span className="hidden max-w-[12rem] truncate text-xs text-ink-faint lg:block">{user.email}</span>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="px-3 py-1.5 text-xs font-medium text-ink-faint transition-colors hover:text-white"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        )}
        nav={nav}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
