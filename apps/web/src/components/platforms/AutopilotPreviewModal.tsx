import { HelpLink } from '@/components/docs/HelpButton.tsx';
import { useState, useEffect } from 'react';
import { fetchAutopilotPreview, type AutopilotSimulationResult } from '@/lib/api/dealershipRecordApi.ts';
import { Button } from '@/components/ui/Button.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';

type Props = {
  dealerId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function AutopilotPreviewModal({ dealerId, isOpen, onClose, onConfirm }: Props) {
  const [simulation, setSimulation] = useState<AutopilotSimulationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetchAutopilotPreview(dealerId, { mode: 'ON' })
      .then(res => setSimulation(res))
      .catch(err => setError(err instanceof Error ? err.message : 'Simulation failed'))
      .finally(() => setLoading(false));
  }, [dealerId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-silver-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-silver-200 bg-gradient-to-r from-silver-50 to-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-orange-100 text-orange-600 text-sm font-bold">
                ⚡
              </span>
              <h2 className="text-lg font-bold text-ink-heading">Preview automatic updates</h2>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              See the updates currently planned for {simulation?.dealerName ?? 'this dealership'}. This preview does not send changes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-silver-400 hover:text-ink-body text-xl font-bold p-1 rounded-md"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="space-y-4 py-4">
              <p className="text-xs text-ink-muted animate-pulse">Checking vehicles and selected destinations…</p>
              <Skeleton rows={5} />
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              <p className="font-semibold">Unable to load the preview:</p>
              <p className="mt-1">{error}</p>
            </div>
          ) : simulation ? (
            <>
              <HelpLink docId="processes/auto-sync">How automatic updates and pauses work</HelpLink>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-green-50/70 border border-green-200/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-green-700 block">Planned sends</span>
                  <span className="text-2xl font-black text-green-800 mt-1 block">
                    {simulation.summary.scheduledOperations.upsert}
                  </span>
                  <span className="text-[11px] text-green-600 mt-0.5 block">listing updates</span>
                </div>
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">Needs attention</span>
                  <span className="text-2xl font-black text-amber-800 mt-1 block">
                    {simulation.summary.needsAttentionCount + simulation.summary.heldCount}
                  </span>
                  <span className="text-[11px] text-amber-600 mt-0.5 block">review the reasons below</span>
                </div>
                <div className="p-4 rounded-xl bg-navy-50/70 border border-navy-200/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-navy-700 block">Planned removals</span>
                  <span className="text-2xl font-black text-navy-800 mt-1 block">
                    {simulation.summary.scheduledOperations.withdraw}
                  </span>
                  <span className="text-[11px] text-navy-600 mt-0.5 block">listing removals</span>
                </div>
              </div>

              {/* Per-Channel Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-ink-muted">Updates by destination</h3>
                <div className="space-y-2">
                  {simulation.channels.map(ch => (
                    <div
                      key={ch.channel}
                      className="p-3.5 rounded-xl border border-silver-200 bg-white hover:border-silver-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-ink-heading">{ch.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            ch.connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-silver-100 text-ink-muted'
                          }`}>
                            {ch.connected ? 'Connected' : 'Setup Needed'}
                          </span>
                          <span className="text-[10px] text-ink-faint font-mono">
                            {ch.qualification === 'VERIFIED_AUTOMATIC' ? 'Automatic updates available' : 'Automatic updates unavailable'}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-ink-body">
                          {ch.scheduledUpserts} planned sends · {ch.blockedCount} blocked
                        </div>
                      </div>

                      {ch.blockers.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-silver-100 space-y-1">
                          {ch.blockers.map((b, idx) => (
                            <div key={idx} className="flex items-start justify-between text-[11px]">
                              <span className="text-amber-700 font-medium flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                {b.vehicleCount} vehicle{b.vehicleCount === 1 ? '' : 's'}: {b.message}
                                {b.sampleStockNumbers.length > 0 && (
                                  <span className="text-ink-faint font-mono text-[10px]">
                                    (e.g. {b.sampleStockNumbers.slice(0, 3).join(', ')})
                                  </span>
                                )}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase ${
                                b.owner === 'DEALERSHIP' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {b.owner === 'DEALERSHIP' ? 'Dealership Action' : 'Support Review'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Guardrail Policy Disclaimer */}
              <div className="space-y-2">
                <div className="p-3.5 rounded-xl bg-silver-50 border border-silver-200 text-ink-muted text-xs flex items-start gap-2.5">
                  <span className="text-sm">🛡️</span>
                  <p className="leading-relaxed">
                    <strong className="text-ink-body font-semibold">Changes may need review:</strong> Missing vehicle details, large price changes, or large batches of removals can hold updates for review. Removal requests apply to managed listings. Listings added manually may need to be removed at the destination.
                  </p>
                </div>
                <div className="px-3.5 py-2 rounded-lg bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Preview checked at {new Date(simulation.evaluatedAt).toLocaleTimeString()}
                  </span>
                  <span className="text-blue-700">
                    Planned updates may change before they are sent
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-silver-200 bg-silver-50 flex items-center justify-between">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={loading || Boolean(error)}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Turn on Autopilot
          </Button>
        </div>
      </div>
    </div>
  );
}
