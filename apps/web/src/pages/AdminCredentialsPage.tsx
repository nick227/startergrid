import { useMemo, useState } from 'react';
import {
  fetchPlatformCredentials,
  validatePlatformCredentials,
  type ProviderCredentialResult,
  type ProviderCredentialSummary,
} from '@/lib/api/admin.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { ErrorState } from '@/components/operator/ErrorState.tsx';
import { toErrorMessage } from '@/lib/errors.ts';

const STATUS_PILLS: Record<ProviderCredentialResult['status'], { label: string; className: string }> = {
  'valid':          { label: 'Valid',          className: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  'invalid':        { label: 'Invalid',        className: 'bg-status-error-bg text-status-error-text border-status-error-border' },
  'unknown':        { label: 'Inconclusive',   className: 'bg-status-warning-bg text-status-warning-text border-status-warning-border' },
  'unreachable':    { label: 'Unreachable',    className: 'bg-status-warning-bg text-status-warning-text border-status-warning-border' },
  'not-configured': { label: 'Not configured', className: 'bg-surface-inset text-ink-faint border-silver-200' },
  'unsupported':    { label: 'No live check',  className: 'bg-surface-inset text-ink-faint border-silver-200' },
};

function StatusPill({ result }: { result: ProviderCredentialResult | undefined }) {
  if (!result) return <span className="text-xs text-ink-faint">—</span>;
  const pill = STATUS_PILLS[result.status];
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-semibold whitespace-nowrap ${pill.className}`}>
      {pill.label}
    </span>
  );
}

function ProviderRow({ summary, result }: {
  summary: ProviderCredentialSummary;
  result: ProviderCredentialResult | undefined;
}) {
  return (
    <tr className="border-b border-silver-100 last:border-0">
      <td className="px-5 py-3 align-top">
        <div className="font-semibold text-ink-heading text-sm">{summary.provider}</div>
        <div className="text-ink-faint text-xs mt-0.5">{summary.platformSlugs.join(', ')}</div>
      </td>
      <td className="px-5 py-3 align-top">
        <div className="font-mono text-xs text-ink-muted">{summary.envVars.join(', ')}</div>
      </td>
      <td className="px-5 py-3 align-top text-center">
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${summary.configured ? 'bg-status-success-text' : 'bg-silver-300'}`} />
      </td>
      <td className="px-5 py-3 align-top">
        <StatusPill result={result} />
        {result && (
          <div className="text-ink-faint text-xs mt-1 max-w-xs break-words">{result.detail}</div>
        )}
      </td>
    </tr>
  );
}

export default function AdminCredentialsPage() {
  const { data, loading, error, reload } = useAsyncQuery(() => fetchPlatformCredentials(), []);
  const [results, setResults] = useState<Map<string, ProviderCredentialResult> | null>(null);
  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);

  const providers = useMemo(() => data?.providers ?? [], [data]);

  const runValidation = async () => {
    setValidating(true);
    setValidateError(null);
    try {
      const { results: outcomes } = await validatePlatformCredentials();
      setResults(new Map(outcomes.map(r => [r.provider, r])));
    } catch (e) {
      setValidateError(toErrorMessage(e));
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 p-6 flex justify-center">
      <div className="w-full max-w-4xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => { window.location.hash = '#/'; }}
              className="text-xs font-semibold text-silver-300 hover:text-orange-400 transition-colors"
            >
              ← Back to dealers
            </button>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-2">Site administration</h1>
            <p className="text-ink-faint text-sm mt-1">
              Developer API keys — verify our platform app credentials authenticate against each provider.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runValidation()}
            disabled={validating || loading}
            className="btn-primary-operator !px-5 !py-2.5 disabled:opacity-40 shrink-0"
          >
            {validating ? 'Validating…' : 'Validate keys'}
          </button>
        </div>

        <div className="bg-surface-card rounded-xl shadow-elevation-3 overflow-hidden border border-silver-200">
          {validateError && (
            <div className="px-5 py-3 bg-status-error-bg border-b border-status-error-border text-xs text-status-error-text">
              Validation failed — {validateError}
            </div>
          )}
          {loading && <div className="p-5"><Skeleton rows={8} /></div>}
          {error && <ErrorState message={error} onRetry={reload} />}
          {!loading && !error && (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-inset border-b border-silver-200 text-xs text-ink-faint uppercase tracking-wide">
                  <th className="px-5 py-3 font-semibold">Provider</th>
                  <th className="px-5 py-3 font-semibold">Env vars</th>
                  <th className="px-5 py-3 font-semibold text-center">Configured</th>
                  <th className="px-5 py-3 font-semibold">Validation</th>
                </tr>
              </thead>
              <tbody>
                {providers.map(p => (
                  <ProviderRow key={p.provider} summary={p} result={results?.get(p.provider)} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-ink-faint text-xs mt-4">
          Live checks call each provider's token endpoint with our app credentials only — no dealer tokens are used.
          Providers marked "No live check" (Apple, TikTok, TikTok Shop) have non-standard token APIs; only env presence is reported.
        </p>
      </div>
    </div>
  );
}
