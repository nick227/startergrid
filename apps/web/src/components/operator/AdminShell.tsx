import { useAuth } from '@/contexts/AuthContext.tsx';

type Props = {
  nav?: React.ReactNode;
  children: React.ReactNode;
};

export function AdminShell({ nav, children }: Props) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-surface-page">
      <header className="bg-navy-950 text-white sticky top-0 z-30 shadow-chrome">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          <div className="py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-navy-800 to-navy-700 flex items-center justify-center text-base shrink-0 shadow-elevation-1">
                📡
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-sm tracking-tight">Admin Operations</h1>
                <p className="text-ink-faint text-[10px] mt-0.5">Site administration · SUPER_ADMIN</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {user && (
                <>
                  <span className="text-ink-faint text-xs hidden lg:block truncate max-w-[12rem]">{user.email}</span>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="px-3 py-1.5 text-xs font-medium text-ink-faint hover:text-white transition-colors"
                  >
                    Sign out
                  </button>
                </>
              )}
            </div>
          </div>

          {nav && (
            <div className="border-t border-navy-800/50">
              {nav}
            </div>
          )}

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
