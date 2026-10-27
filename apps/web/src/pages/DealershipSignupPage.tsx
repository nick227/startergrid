import { HelpButton } from '@/components/docs/HelpButton.tsx';
import { useState } from 'react';
import { DealershipIntakeFlow } from '@/components/dealers/DealershipIntakeFlow.tsx';
import { createDealershipSignup, uploadSignupDealerLogo } from '@/lib/api/sdk.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { AppHeader } from '@/components/operator/AppHeader.tsx';

export default function DealershipSignupPage() {
  const [submitting, setSubmitting] = useState(false);
  const { refresh } = useAuth();

  return (
    <div className="min-h-screen bg-surface-page">
      <AppHeader publicRoute="signup" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink-heading">Create your dealership</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
          Tell us where the dealership operates and which channels you want to prepare first.
        </p>

        <div className="relative mt-8 rounded-xl border border-silver-200 bg-surface-card p-6 shadow-elevation-2">
          <DealershipIntakeFlow
            mode="signup"
            steps="rail"
            onSubmit={createDealershipSignup}
            onUploadLogo={uploadSignupDealerLogo}
            onComplete={async response => {
              setSubmitting(true);
              await refresh();
              window.location.assign(`#/${response.dealer.id}/platforms`);
            }}
            onCancel={() => { window.location.assign('#/'); }}
          />
          {submitting && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/50 backdrop-blur-sm">
              <span className="animate-pulse text-sm font-semibold text-ink-faint">Setting up workspace...</span>
            </div>
          )}
        </div>
        <div className="mt-4"><HelpButton topic="app/getting-started" /></div>
      </main>
    </div>
  );
}
