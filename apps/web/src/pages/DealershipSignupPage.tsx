import { useState } from 'react';
import { DealershipIntakeFlow } from '@/components/dealers/DealershipIntakeFlow.tsx';
import { createDealershipSignup, uploadSignupDealerLogo } from '@/lib/api/sdk.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';

export default function DealershipSignupPage() {
  const [submitting, setSubmitting] = useState(false);
  const { refresh } = useAuth();

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-navy-800 to-navy-700 flex items-center justify-center text-2xl mx-auto mb-4 shadow-chrome">
            AD
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{operatorCopy.app.title}</h1>
          <p className="text-ink-faint mt-2 text-sm max-w-md mx-auto leading-relaxed">
            Create a dealership workspace for inventory, channel setup, and publishing readiness.
          </p>
        </div>

        <div className="bg-surface-card rounded-xl shadow-elevation-3 border border-silver-200 p-6">
          <DealershipIntakeFlow
            mode="signup"
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
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-xl backdrop-blur-sm">
              <span className="text-ink-faint text-sm font-semibold animate-pulse">Setting up workspace...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
