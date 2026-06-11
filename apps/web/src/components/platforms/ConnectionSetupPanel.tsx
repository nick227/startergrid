import { useState } from 'react';
import { updateAccount, validateAccount } from '@/lib/api/sdk.ts';
import type { PlatformPublishResult, PlatformAccountDetail } from '@/lib/types.ts';
import { OAuthConnectButton } from './OAuthConnectButton.tsx';
import { getValidationFeedback } from '@/lib/validationPresentation.ts';
import { getSetupReadiness } from '@/lib/setupReadiness.ts';

type Props = {
  dealerId: string;
  platform: PlatformPublishResult;
  account?: PlatformAccountDetail;
  onRefresh: () => void;
};

export function ConnectionSetupPanel({ dealerId, platform, account, onRefresh }: Props) {
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data from existing account or connectionConfig
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (!account) return init;
    
    // Map known top-level fields
    if (account.accountId) init.accountId = account.accountId;
    if (account.platformRepName) init.platformRepName = account.platformRepName;
    if (account.platformRepEmail) init.platformRepEmail = account.platformRepEmail;
    if (account.membershipStatus) init.membershipStatus = account.membershipStatus;
    
    // Merge existing config
    if (account.connectionConfig) {
      for (const [k, v] of Object.entries(account.connectionConfig)) {
        if (typeof v === 'string') init[k] = v;
      }
    }
    return init;
  });

  const fields = account?.connectionFields || [];
  
  // If no fields and not OAuth, it might just be a direct connection
  const isOAuth = platform.connectionType === 'OAUTH' && !!account?.oauthProvider;
  const hasFields = fields.length > 0;
  
  // Is it already active?
  const isActive = account?.state === 'ACTIVE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, any> = {
        connectionConfig: { ...formData },
        state: 'READY_TO_SUBMIT', // advance state once config is provided
      };
      
      // Extract known top-level fields
      if (formData.accountId !== undefined) payload.accountId = formData.accountId;
      if (formData.platformRepName !== undefined) payload.platformRepName = formData.platformRepName;
      if (formData.platformRepEmail !== undefined) payload.platformRepEmail = formData.platformRepEmail;
      if (formData.membershipStatus !== undefined) payload.membershipStatus = formData.membershipStatus;

      // Ensure secret fields aren't completely lost if empty in formData but existed previously (we can't easily merge without backend help, but we'll assume a full overwrite for this POC)
      
      await updateAccount(dealerId, platform.platformSlug, payload);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save connection config');
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    setError(null);
    try {
      await validateAccount(dealerId, platform.platformSlug);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to validate connection config');
    } finally {
      setValidating(false);
    }
  };


  const readiness = getSetupReadiness(platform, account || null);

  return (
    <div className="bg-white border border-silver-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-silver-200 bg-silver-50 flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink-heading">Connection Setup</h2>
        {readiness.setupProgress && (
          <span className="text-xs font-semibold text-ink-muted">
            {readiness.setupProgress}
          </span>
        )}
      </div>

      <div className="p-5 space-y-6">
        {/* Render Validation Feedback (if it was ever tested or is ready) */}
        {(() => {
          const feedback = getValidationFeedback(account);
          if (feedback.state === 'NOT_TESTED' && !account?.connectionConfig) return null;
          
          let alertClass = 'bg-silver-50 border-silver-200';
          let titleClass = 'text-ink-heading';
          if (feedback.state === 'HEALTHY') {
            alertClass = 'bg-green-50 border-green-200';
            titleClass = 'text-green-800';
          } else if (feedback.state === 'FAILED') {
            alertClass = 'bg-red-50 border-red-200';
            titleClass = 'text-red-800';
          }

          return (
            <div className={`p-4 rounded-lg border ${alertClass}`}>
              <div className="flex justify-between items-start">
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${titleClass}`}>
                  {feedback.title}
                </h3>
                {feedback.lastValidatedLabel && (
                  <span className="text-[10px] text-ink-faint font-semibold">{feedback.lastValidatedLabel}</span>
                )}
              </div>
              <p className="text-sm text-ink-body mb-2">{feedback.message}</p>
              {feedback.actionableHint && (
                <p className="text-xs text-orange-600 font-semibold">{feedback.actionableHint}</p>
              )}
            </div>
          );
        })()}
        
        {(readiness.missingRequiredFields.length > 0 || readiness.missingRequiredSecrets.length > 0) && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="text-[11px] font-bold text-amber-800 mb-2 uppercase tracking-wide">Missing Requirements</h3>
            <ul className="list-disc list-inside text-sm text-amber-900 space-y-1">
              {readiness.missingRequiredFields.map(f => <li key={f}>{f}</li>)}
              {readiness.missingRequiredSecrets.map(f => <li key={f}>{f}</li>)}
            </ul>
          </div>
        )}

        {/* Render Setup Instructions */}
        {platform.setupInstructions && platform.setupInstructions.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-blue-900 mb-3">Setup Instructions</h3>
            <ol className="list-decimal list-outside ml-4 space-y-2 text-sm text-blue-900/90">
              {platform.setupInstructions.map((instruction, idx) => (
                <li key={idx} className="pl-1 leading-snug">{instruction}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Render OAuth Flow */}
        {isOAuth && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-ink-body">OAuth Authorization</h3>
            <p className="text-sm text-ink-muted">
              Connect via {account.oauthProvider} to authorize this platform.
            </p>
            <div className="pt-2">
              <OAuthConnectButton
                dealerId={dealerId}
                platformSlug={platform.platformSlug}
                providerDisplayName={account.oauthProvider || 'Provider'}
                isReconnect={isActive}
                onDone={onRefresh}
              />
            </div>
          </div>
        )}

        {/* Render Dynamic Fields */}
        {hasFields && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map(field => {
                // If it's a secret and we have a value already (from connectionConfig), we might show a placeholder "********"
                const isSecret = field.isSecret;
                const hasExistingSecret = isSecret && account?.connectionConfig?.[field.field];
                
                return (
                  <div key={field.field} className="space-y-1">
                    <div className="flex justify-between items-end">
                      <label className="text-xs font-bold text-ink-body block">
                        {field.label}
                      </label>
                      {field.docsLink && (
                        <a href={field.docsLink} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline">
                          What is this?
                        </a>
                      )}
                    </div>
                    <input
                      type={isSecret ? 'password' : 'text'}
                      className="w-full text-sm border-silver-300 rounded-lg shadow-sm focus:ring-navy-500 focus:border-navy-500"
                      placeholder={hasExistingSecret ? '••••••••' : field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      value={formData[field.field] || ''}
                      pattern={field.pattern}
                      onChange={e => setFormData(prev => ({ ...prev, [field.field]: e.target.value }))}
                      required
                    />
                    {field.hint && (
                      <p className="text-[11px] text-ink-muted">{field.hint}</p>
                    )}
                    {field.validationHint && (
                      <p className="text-[10px] text-status-warning-text bg-status-warning-bg px-2 py-1 rounded mt-1 border border-status-warning-border">
                        {field.validationHint}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-100">
                {error}
              </div>
            )}

            <div className="pt-4 border-t border-silver-100 flex justify-end gap-3">
              {(fields.some(f => f.isSecret && account?.connectionConfig?.[f.field]) || isActive || account?.state === 'FAILED' || account?.state === 'READY') && (
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={validating || saving}
                  className="px-4 py-2 bg-silver-100 hover:bg-silver-200 text-ink-body text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {validating ? 'Validating...' : 'Validate Connection'}
                </button>
              )}
              <button
                type="submit"
                disabled={saving || validating}
                className="px-4 py-2 bg-navy-600 hover:bg-navy-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : isActive ? 'Update Configuration' : 'Save & Continue'}
              </button>
            </div>
          </form>
        )}

        {!hasFields && !isOAuth && (
          <div className="text-sm text-ink-muted italic">
            No specific connection fields required. This platform may be completely assisted or direct.
          </div>
        )}
      </div>
    </div>
  );
}
