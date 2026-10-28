import { HelpButton } from '@/components/docs/HelpButton.tsx';
import { useState } from 'react';
import { DealershipIntakeFlow } from '@/components/dealers/DealershipIntakeFlow.tsx';
import { createDealershipSignup, uploadSignupDealerLogo } from '@/lib/api/sdk.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { AuthFrame } from '@/components/operator/AuthFrame.tsx';

export default function DealershipSignupPage() {
  const [submitting, setSubmitting] = useState(false);
  const { refresh } = useAuth();

  return (
    <AuthFrame route="signup">
      <div className="relative w-full">
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
          footer={<HelpButton topic="app/getting-started" inverted />}
        />
        {submitting && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-navy-950/70">
            <span className="animate-pulse text-sm font-semibold text-white/70">Setting up workspace</span>
          </div>
        )}
      </div>
    </AuthFrame>
  );
}
