import { useCallback, useEffect, useRef, useState } from 'react';
import { distributionRequest, saveAutopilot, type V5AutopilotSummary, type V5DistributionIncident } from '@/lib/api/autopilotApi.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { AutopilotStatusCard } from './AutopilotStatusCard.tsx';
import type { AutopilotPreference, AutopilotView } from '@/lib/autopilotStatus.ts';

type Props = { dealerId: string; preference?: AutopilotPreference | null; connectedChannelCount?: number;
  onUpdated?: (preference: AutopilotPreference) => void; hideWhenUnavailable?: boolean };
export function DealershipAutopilot({ dealerId, onUpdated, hideWhenUnavailable }: Props) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<V5AutopilotSummary | null>(null);
  const [issues, setIssues] = useState<V5DistributionIncident[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [approval, setApproval] = useState<{ id: string; reason: string } | null>(null);
  const requestVersion = useRef(0);
  const scope = useRef(dealerId); scope.current = dealerId;
  const canManage = user?.role !== 'DEALER_STAFF';
  const internal = ['SUPER_ADMIN','INTERNAL_SUPPORT','OPERATOR'].includes(user?.role ?? '');
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    const [data, incidents] = await Promise.all([
      distributionRequest<V5AutopilotSummary>(dealerId, '/autopilot'),
      distributionRequest<{items: V5DistributionIncident[]}>(dealerId, '/distribution/incidents'),
    ]);
    if(scope.current !== dealerId || requestVersion.current !== version) return;
    setSummary(data); setIssues(incidents.items);
  }, [dealerId]);
  useEffect(() => {
    let live = true;
    setSummary(null); setIssues([]); setError(null); setApproval(null);
    const refresh = () => { void load().catch(e => { if(live && scope.current === dealerId) setError(e.message); }); };
    refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('distribution-updated', refresh);
    return () => { live = false; requestVersion.current++; window.clearInterval(timer); window.removeEventListener('distribution-updated', refresh); };
  }, [load, dealerId]);
  const perform = async (work: () => Promise<unknown>) => {
    setSaving(true); setError(null);
    try { await work(); await load(); window.dispatchEvent(new Event('distribution-updated')); }
    catch(e) { if(scope.current === dealerId) { setError(e instanceof Error ? e.message : 'Distribution update failed.'); await load().catch(() => {}); } }
    finally { if(scope.current === dealerId) setSaving(false); }
  };
  const setMode = (mode: AutopilotPreference) => {
    if (!summary) return;
    void perform(async () => { await saveAutopilot(dealerId, summary, {mode}); onUpdated?.(mode); });
  };
  const mode = summary?.policy.mode ?? 'OFF';
  const view: AutopilotView = {
    preference: mode, label: !summary ? error ? 'unavailable' : 'loading' : mode === 'ON' && summary.coverage === 'UNAVAILABLE' ? 'on — needs setup' : mode.toLowerCase(),
    tone: mode === 'ON' ? 'on' : mode === 'PAUSED' ? 'paused' : 'off',
    summary: summary ? `${summary.counts.VERIFIED_LIVE ?? 0} vehicle destinations verified live · ${summary.openIncidents} open issues.` : 'Reading the saved distribution policy.',
    guidance: 'Only selected qualified channels receive updates. Pausing does not freeze fields on existing marketplace listings. Sold-vehicle withdrawals continue.',
    canPause: !!summary && mode === 'ON' && canManage, canResume: !!summary && mode === 'PAUSED' && canManage,
  };
  if (hideWhenUnavailable && !summary) return null;
  const act = (issue: V5DistributionIncident, action: string, reason?: string) => perform(async () => {
    const result = await distributionRequest<{ authUrl?: string }>(dealerId, '/distribution/incidents/' + issue.id + '/' + action,
      { ...(reason ? {reason} : {}), ...(typeof issue.technicalEvidence.desiredHash === 'string' ? {expectedHash: issue.technicalEvidence.desiredHash} : {}) });
    if(result.authUrl) window.location.assign(result.authUrl);
    setApproval(null);
  });
  return <div className="space-y-3">
    <AutopilotStatusCard view={view} saving={saving} onPause={() => setMode('PAUSED')} onResume={() => setMode('ON')}
      extraAction={summary && canManage ? <button disabled={saving} className="btn-secondary-operator text-xs"
        onClick={() => setMode(mode === 'OFF' ? 'ON' : 'OFF')}>{mode === 'OFF' ? 'Turn on Autopilot' : 'Turn off'}</button> : undefined} />
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {summary && <details className="surface-card-operator p-4">
      <summary>Automatic destinations ({summary.policy.includedChannels.length} selected)</summary>
      {summary.capabilities.map(c => <label key={c.channel} className="block py-2 text-sm">
        <input type="checkbox" checked={summary.policy.includedChannels.includes(c.channel)}
          disabled={!canManage || saving || c.qualification !== 'VERIFIED_AUTOMATIC'}
          onChange={e => { const includedChannels = e.target.checked ? [...summary.policy.includedChannels,c.channel] : summary.policy.includedChannels.filter(x => x !== c.channel);
            void perform(() => saveAutopilot(dealerId, summary, {includedChannels})); }} />
        {' '}{c.channel} — {c.qualification.toLowerCase().replace(/_/g,' ')}
        <span className="block text-ink-muted">{c.reason}</span>
      </label>)}
    </details>}
    {issues.map(issue => <article key={issue.id} className="surface-card-operator p-4 space-y-2">
      <p className="font-semibold">{issue.description}</p><p>{issue.channel} · Owner: {issue.owner}</p>
      <p>{issue.businessImpact}</p><p>Next: {issue.nextAction}</p>
      {canManage && <div className="flex gap-3">
        <button disabled={saving} onClick={() => void act(issue,'retry')}>Retry</button>
        <button disabled={saving} onClick={() => void act(issue,'resolve')}>Verify resolution</button>
        {issue.reasonCode.includes('CONNECTION') && <button disabled={saving} onClick={() => void act(issue,'reconnect')}>Reconnect</button>}
        {internal && ['PRICE_MUTATION_HELD','PRICE_CHANGE','REMOVAL_BATCH','MASS_REMOVAL'].includes(issue.reasonCode) &&
          <button disabled={saving} onClick={() => setApproval({id:issue.id,reason:''})}>Review approval</button>}
      </div>}
      {approval?.id === issue.id && <form className="space-y-2" onSubmit={e => { e.preventDefault(); void act(issue,'approve',approval.reason); }}>
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(issue.technicalEvidence,null,2)}</pre>
        <label>Approval reason<input required maxLength={500} className="border rounded p-2 w-full" value={approval.reason}
          onChange={e => setApproval({...approval,reason:e.target.value})} /></label>
        <button disabled={saving}>Approve this change</button>
      </form>}
    </article>)}
  </div>;
}
