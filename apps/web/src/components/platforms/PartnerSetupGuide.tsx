import { useAuth } from '@/contexts/AuthContext.tsx';
import { isInternalSupportRole } from '@/lib/operatorAccess.ts';
import {
  presentSetupSteps,
  presentValidationNote,
  rewriteSetupStep,
} from '@/lib/partnerSetupPresentation.ts';

export type PartnerSetupGuideData = {
  shortBlurb: string;
  connectionLabel: string;
  steps: string[];
  dealerPortalUrl?: string | null;
  validationNote: string;
};

function connectionKindLabel(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes('oauth')) return 'Sign in with their website';
  if (lower.includes('feed')) return 'They receive listings from us';
  if (lower.includes('api')) return 'We send listings directly';
  return label;
}

export function PartnerSetupGuide({ guide }: { guide: PartnerSetupGuideData }) {
  const { user } = useAuth();
  const isInternal = isInternalSupportRole(user?.role ?? '');
  const { dealerSteps, technicalSteps } = presentSetupSteps(guide.steps);
  const note = presentValidationNote(guide.validationNote);

  return (
    <div className="bg-white border border-silver-200 rounded-xl shadow-sm p-5 space-y-4">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-faint">How to connect</h2>
      {guide.shortBlurb && (
        <p className="text-sm text-ink-body leading-relaxed">
          {rewriteSetupStep(guide.shortBlurb)}
        </p>
      )}
      <p className="text-sm text-ink-muted">{connectionKindLabel(guide.connectionLabel)}</p>
      {dealerSteps.length > 0 && (
        <ol className="space-y-2">
          {dealerSteps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-ink-body">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-navy-800 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
              <span className="leading-snug">{step}</span>
            </li>
          ))}
        </ol>
      )}
      {guide.dealerPortalUrl && (
        <a
          href={guide.dealerPortalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-600 hover:text-navy-800"
        >
          <span className="text-base leading-none">↗</span> Open their website
        </a>
      )}
      {note.dealer && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-900/80 leading-snug">{note.dealer}</p>
        </div>
      )}
      {isInternal && (technicalSteps.length > 0 || note.technical) && (
        <details className="rounded-lg border border-silver-200 bg-silver-50">
          <summary className="px-3 py-2 cursor-pointer text-xs font-semibold text-ink-heading">
            File transfer, feed, and credentials
          </summary>
          <div className="px-3 pb-3 space-y-2">
            {technicalSteps.length > 0 && (
              <ol className="list-decimal list-inside space-y-1 text-xs text-ink-body">
                {technicalSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            )}
            {note.technical && <p className="text-xs text-ink-muted">{note.technical}</p>}
          </div>
        </details>
      )}
    </div>
  );
}
