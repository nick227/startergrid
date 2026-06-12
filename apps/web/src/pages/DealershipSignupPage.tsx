import { useState } from 'react';
import { DealershipIntakeFlow } from '@/components/dealers/DealershipIntakeFlow.tsx';
import { createDealershipSignup, uploadSignupDealerLogo } from '@/lib/api/sdk.ts';
import type { CreateDealershipResponse } from '@/lib/types.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

export default function DealershipSignupPage() {
  const [created, setCreated] = useState<CreateDealershipResponse | null>(null);

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
          {created ? (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-status-success-bg border border-status-success-border flex items-center justify-center text-status-success-text font-bold">
                OK
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink-heading">{created.dealer.legalName} is created</h2>
                <p className="text-sm text-ink-muted mt-2">
                  The dealership profile is ready. Sign in or contact your account owner to access the workspace.
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <button type="button" onClick={() => { window.location.assign('#/'); }} className="btn-primary-operator">
                  Continue
                </button>
                <button type="button" onClick={() => setCreated(null)} className="px-3 py-2 text-sm font-semibold text-ink-muted hover:text-ink-heading border border-silver-300 rounded-md">
                  Add another
                </button>
              </div>
            </div>
          ) : (
            <DealershipIntakeFlow
              mode="signup"
              onSubmit={createDealershipSignup}
              onUploadLogo={uploadSignupDealerLogo}
              onComplete={setCreated}
              onCancel={() => { window.location.assign('#/'); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
