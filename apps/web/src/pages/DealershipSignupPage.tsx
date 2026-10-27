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
      <div className="relative">
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
          footer={<HelpButton topic="app/getting-started" />}
        />
        {submitting && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm">
            <span className="animate-pulse text-sm font-semibold tracking-wide text-ink-muted">Setting up workspace</span>
          </div>
        )}
      </div>
    </div>
  );
}
