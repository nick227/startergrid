import { useState, useEffect } from 'react';
import type { PlatformAccountDetail, SocialPreviewResponse } from '@/lib/types.ts';
import { fetchAccounts, previewSocialPost, publishSocialPost } from '@/lib/api/sdk.ts';
import { Modal } from '@/components/ui/Modal.tsx';


const PLATFORM_LABELS: Record<string, string> = {
  'facebook-business-page': 'Facebook Business Page',
  'google-business-profile': 'Google Business Profile',
};

type Step = 'platform' | 'preview' | 'result';

type Props = {
  dealerId: string;
  vehicleId: string;
  vehicleTitle: string;
  onClose: () => void;
};

function StepIndicator({ step }: { step: Step }) {
  const steps: Array<{ key: Step; label: string }> = [
    { key: 'platform', label: 'Destination' },
    { key: 'preview',  label: 'Preview' },
    { key: 'result',   label: 'Publish' },
  ];
  const order: Record<Step, number> = { platform: 0, preview: 1, result: 2 };

  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className={`flex items-center gap-1.5 ${order[step] >= i ? 'text-navy-700' : 'text-ink-faint'}`}>
            <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border ${
              order[step] > i
                ? 'bg-navy-600 border-navy-600 text-white'
                : order[step] === i
                  ? 'border-navy-600 text-navy-700 bg-navy-50'
                  : 'border-silver-200 text-ink-faint bg-white'
            }`}>
              {order[step] > i ? '✓' : i + 1}
            </span>
            <span className="text-[11px] font-semibold">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px w-6 mx-2 ${order[step] > i ? 'bg-navy-400' : 'bg-silver-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export function CreatePostModal({ dealerId, vehicleId, vehicleTitle, onClose }: Props) {
  const [socialPlatforms, setSocialPlatforms] = useState<PlatformAccountDetail[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('platform');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [preview, setPreview] = useState<SocialPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<{ externalUrl?: string | null; pageName?: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetchAccounts(dealerId)
      .then(res => {
        if (!active) return;
        const social = res.accounts.filter(
          a => a.socialPosting && a.oauthConnected,
        );
        setSocialPlatforms(social);
        // Auto-select if only one connected platform
        if (social.length === 1) {
          setSelectedSlug(social[0].platformSlug);
        }
        setLoadingAccounts(false);
      })
      .catch(e => {
        if (!active) return;
        setAccountsError(e instanceof Error ? e.message : 'Failed to load platforms');
        setLoadingAccounts(false);
      });
    return () => { active = false; };
  }, [dealerId]);

  const handleProceedToPreview = async (slug: string) => {
    setSelectedSlug(slug);
    setStep('preview');
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await previewSocialPost(dealerId, slug, vehicleId);
      setPreview(res);
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedSlug) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await publishSocialPost(dealerId, selectedSlug, vehicleId);
      setPublishResult({
        externalUrl: res.post.externalUrl,
        pageName: res.post.pageAccount?.name,
      });
      setStep('result');
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const platformName = selectedSlug
    ? (PLATFORM_LABELS[selectedSlug] ?? selectedSlug)
    : '';

  return (
    <Modal maxWidth="max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-silver-100">
        <div>
          <h2 className="text-sm font-bold text-ink-heading">Create Post</h2>
          <p className="text-[11px] text-ink-muted mt-0.5 truncate max-w-[280px]">{vehicleTitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-ink-faint hover:text-ink-body text-lg leading-none px-1"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-5 flex-1 overflow-y-auto">

        {/* Loading accounts */}
        {loadingAccounts && (
          <p className="text-xs text-ink-faint py-4 text-center">Loading connected platforms…</p>
        )}

        {accountsError && (
          <p className="text-xs text-status-error-text py-4">{accountsError}</p>
        )}

        {!loadingAccounts && !accountsError && socialPlatforms.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm font-semibold text-ink-heading mb-2">No social platforms connected</p>
            <p className="text-xs text-ink-muted">
              Connect Facebook Business Page or Google Business Profile in the Platforms tab.
            </p>
          </div>
        )}

        {!loadingAccounts && socialPlatforms.length > 0 && (
          <>
            <StepIndicator step={step} />

            {/* Step 1 — Platform picker */}
            {step === 'platform' && (
              <div className="space-y-2">
                <p className="text-xs text-ink-muted mb-3">Choose where to publish this post:</p>
                {socialPlatforms.map(platform => (
                  <button
                    key={platform.platformSlug}
                    type="button"
                    onClick={() => void handleProceedToPreview(platform.platformSlug)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors hover:border-navy-300 hover:bg-navy-50 ${
                      selectedSlug === platform.platformSlug
                        ? 'border-navy-400 bg-navy-50'
                        : 'border-silver-200 bg-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink-heading">
                        {PLATFORM_LABELS[platform.platformSlug] ?? platform.platformName}
                      </p>
                    </div>
                    <span className="text-ink-faint text-sm">→</span>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2 — Preview */}
            {step === 'preview' && (
              <div className="space-y-4">
                {previewLoading && (
                  <p className="text-xs text-ink-faint text-center py-4">Building preview…</p>
                )}
                {previewError && (
                  <p className="text-xs text-status-error-text">{previewError}</p>
                )}

                {preview && !previewLoading && (
                  <>
                    {/* Destination page */}
                    {preview.selectedPage ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-navy-50 border border-navy-100">
                        {preview.selectedPage.pictureUrl && (
                          <img
                            src={preview.selectedPage.pictureUrl}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Posting to</p>
                          <p className="text-xs font-semibold text-ink-heading">{preview.selectedPage.name}</p>
                          <p className="text-[11px] text-ink-faint">{platformName}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <p className="text-xs font-semibold text-amber-800">No page selected</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Go to Platforms → {platformName} → Social tab to select a page first.
                        </p>
                      </div>
                    )}

                    {/* Post copy */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Post text</p>
                      <div className="rounded-lg border border-silver-200 p-3 bg-silver-50">
                        <p className="text-xs text-ink-body whitespace-pre-wrap leading-relaxed">
                          {preview.preview.postText}
                        </p>
                      </div>
                    </div>

                    {/* Image */}
                    {preview.preview.imageUrl && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Image</p>
                        <img
                          src={preview.preview.imageUrl}
                          alt="Vehicle"
                          className="w-full max-h-48 object-cover rounded-lg border border-silver-200"
                        />
                      </div>
                    )}

                    {/* Listing link */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Link</p>
                      <a
                        href={preview.preview.listingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-orange-600 hover:underline break-all"
                      >
                        {preview.preview.listingUrl}
                      </a>
                    </div>

                    {publishError && (
                      <p className="text-xs text-status-error-text">{publishError}</p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Step 3 — Result */}
            {step === 'result' && publishResult && (
              <div className="text-center py-4 space-y-3">
                <div className="text-3xl">✓</div>
                <p className="text-sm font-bold text-ink-heading">Post published!</p>
                {publishResult.pageName && (
                  <p className="text-xs text-ink-muted">
                    Posted to <strong>{publishResult.pageName}</strong> on {platformName}
                  </p>
                )}
                {publishResult.externalUrl && (
                  <a
                    href={publishResult.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs font-semibold text-orange-600 hover:underline"
                  >
                    View post →
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-silver-100 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={step === 'platform' || step === 'result' ? onClose : () => setStep('platform')}
          className="text-xs font-semibold text-ink-muted hover:text-ink-body"
        >
          {step === 'result' ? 'Close' : step === 'platform' ? 'Cancel' : 'Back'}
        </button>

        {step === 'preview' && preview?.selectedPage && !previewLoading && (
          <button
            type="button"
            disabled={publishing}
            onClick={() => void handlePublish()}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-navy-600 text-white hover:bg-navy-700 disabled:opacity-50"
          >
            {publishing ? 'Publishing…' : `Post to ${preview.selectedPage.name}`}
          </button>
        )}

        {step === 'result' && (
          <span /> // spacer — close is on left
        )}
      </div>
    </Modal>
  );
}
