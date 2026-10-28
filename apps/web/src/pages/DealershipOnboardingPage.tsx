import { HelpButton } from '@/components/docs/HelpButton.tsx';
import { useState } from 'react';
import { DealershipIntakeFlow } from '@/components/dealers/DealershipIntakeFlow.tsx';
import { createDealershipOnboarding, uploadSignupDealerLogo } from '@/lib/api/sdk.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { AppHeader } from '@/components/operator/AppHeader.tsx';

export default function DealershipOnboardingPage() {
  const { user, logout, refresh } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col bg-navy-950 text-white">
      <AppHeader
        end={(
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-white/70 sm:inline">{user?.email}</span>
            <button type="button" onClick={() => { void logout(); }} className="text-sm font-medium text-white/70 hover:text-white">
              Sign out
            </button>
          </div>
        )}
      />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col px-5 py-10">
        <DealershipIntakeFlow
          mode="onboarding"
          steps="rail"
          onSubmit={createDealershipOnboarding}
          onUploadLogo={uploadSignupDealerLogo}
          onComplete={async response => {
            setSubmitting(true);
            await refresh();
            window.location.assign(`#/${response.dealer.id}/platforms`);
          }}
          footer={<HelpButton topic="app/getting-started" inverted />}
        />
        {submitting && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-navy-950/70">
            <span className="animate-pulse text-sm font-semibold text-white/70">Setting up workspace</span>
          </div>
        )}
      </main>
    </div>
  );
}
