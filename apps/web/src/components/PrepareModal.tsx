import { useState, useEffect } from 'react';
import { runPrepare } from '../lib/api.ts';
import type { PrepareResult } from '../lib/types.ts';
import { PublishStateBadge } from './operator/StatusBadge.tsx';
import ActionBanner from './ActionBanner.tsx';

type Props = {
  dealerId: string;
  dealerName: string;
  onClose: () => void;
  onExecuted: () => void;
};

type Phase = 'idle' | 'previewing' | 'preview_done' | 'confirming' | 'executing' | 'done' | 'error';

export default function PrepareModal({ dealerId, dealerName, onClose, onExecuted }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [preview, setPreview] = useState<PrepareResult | null>(null);
  const [result, setResult] = useState<PrepareResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Run dry-run on mount
  useEffect(() => {
    setPhase('previewing');
    runPrepare(dealerId, { dryRun: true })
      .then(r => { setPreview(r); setPhase('preview_done'); })
      .catch(e => { setErrorMsg(e instanceof Error ? e.message : 'Preview failed'); setPhase('error'); });
  }, [dealerId]);

  const execute = async () => {
    setPhase('executing');
    try {
      const r = await runPrepare(dealerId, { dryRun: false });
      setResult(r);
      setPhase('done');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Execute failed');
      setPhase('error');
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const displayResult = result ?? preview;
  const isDone = phase === 'done';

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Modal header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">
              {isDone ? 'Prepare & Publish — Complete' : 'Prepare & Publish'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{dealerName}</p>
          </div>
          {(isDone || phase === 'preview_done' || phase === 'error') && (
            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
              isDone ? 'bg-green-100 text-green-700' :
              phase === 'error' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {isDone ? 'Executed' : phase === 'error' ? 'Error' : 'Dry-run preview'}
            </span>
          )}
          <button onClick={onClose} className="ml-2 text-slate-300 hover:text-slate-500 text-lg leading-none">×</button>
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-5">
          {/* Loading state */}
          {(phase === 'previewing' || phase === 'executing') && (
            <div className="py-12 text-center">
              <div className="text-slate-400 text-sm animate-pulse">
                {phase === 'previewing' ? 'Running dry-run preview…' : 'Executing prepare & publish…'}
              </div>
            </div>
          )}

          {/* Error state */}
          {phase === 'error' && (
            <div className="py-8 text-center">
              <div className="text-red-500 font-medium text-sm mb-2">{errorMsg}</div>
              <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">Close</button>
            </div>
          )}

          {/* Result content */}
          {displayResult && phase !== 'previewing' && phase !== 'executing' && (
            <>
              {/* Action banner */}
              <ActionBanner
                action={displayResult.nextRecommendedAction}
                summary={displayResult.summary}
                vehicles={displayResult.vehicles}
              />

              {/* Vehicle summary */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total', value: displayResult.vehicles.total, color: 'bg-slate-50 text-slate-600 border-slate-200' },
                  { label: 'Ready', value: displayResult.vehicles.ready, color: 'bg-green-50 text-green-700 border-green-200' },
                  { label: 'Warning', value: displayResult.vehicles.warning, color: 'bg-amber-50 text-amber-700 border-amber-200' },
                  { label: 'Blocked', value: displayResult.vehicles.blocked, color: 'bg-red-50 text-red-700 border-red-200' }
                ].map(({ label, value, color }) => (
                  <div key={label} className={`rounded-lg border p-3 ${color}`}>
                    <div className="text-xl font-bold leading-none">{value}</div>
                    <div className="text-xs mt-1 opacity-70">{label}</div>
                  </div>
                ))}
              </div>

              {/* Blocked vehicle details */}
              {displayResult.vehicles.blocked > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Blocked vehicles
                  </h3>
                  <div className="space-y-1.5">
                    {displayResult.vehicles.details
                      .filter(v => v.label === 'blocked')
                      .map(v => (
                        <div key={v.stockNumber} className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                          <span className="text-xs font-mono font-medium text-red-700 shrink-0">{v.stockNumber}</span>
                          <span className="text-xs text-red-600 truncate">
                            {v.issues[0]?.message ?? 'Validation failed'}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Platform grid */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Platforms ({displayResult.platforms.length})
                  {displayResult.dryRun && <span className="ml-2 font-normal text-blue-500 normal-case">[preview — no changes made]</span>}
                </h3>
                <div className="border border-slate-100 rounded-lg divide-y divide-slate-50 overflow-hidden">
                  {displayResult.platforms.map(p => (
                    <div key={p.platformSlug} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                      <div className="w-32 shrink-0">
                        <PublishStateBadge state={p.state} />
                      </div>
                      <span className="flex-1 text-sm text-slate-700 truncate">{p.platformName}</span>
                      {['Blocked', 'Needs Approval', 'Failed'].includes(p.state) && (
                        <span className="text-xs text-slate-400 truncate max-w-48" title={p.detail}>{p.detail}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
          <div className="text-xs text-slate-400">
            {displayResult && !isDone && (
              <>Preview only — no DB changes made until you execute</>
            )}
            {isDone && (
              <span className="text-green-600">
                ✓ Prepare & publish executed successfully
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isDone ? (
              <button
                onClick={onExecuted}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Done — refresh status
              </button>
            ) : phase === 'preview_done' ? (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void execute()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Execute prepare &amp; publish
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                {phase === 'error' ? 'Dismiss' : 'Cancel'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
