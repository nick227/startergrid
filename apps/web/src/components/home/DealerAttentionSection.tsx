import { useState } from 'react';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import type { AttentionItem, AttentionResponse } from '@/lib/api/attentionApi.ts';

type Props = {
  dealerId: string;
  attention: AttentionResponse | null;
  nav: OperatorNavHandlers;
  onRefresh?: () => void;
};

export function DealerAttentionSection({ dealerId: _dealerId, attention, nav }: Props) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [showWaiting, setShowWaiting] = useState(false);

  if (!attention) return null;

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const dealershipItems = attention.items.filter(
    item => item.owner === 'DEALERSHIP' && item.severity !== 'WAITING'
  );
  const waitingItems = attention.items.filter(
    item => item.owner !== 'DEALERSHIP' || item.severity === 'WAITING'
  );

  const handleAction = (item: AttentionItem) => {
    if (!item.action.enabled) return;
    const kind = item.action.kind;
    const vehicleIds = (item.records || [])
      .map(r => r.vehicleId || (r.type === 'VEHICLE' ? r.id : null))
      .filter((id): id is string => Boolean(id));

    switch (kind) {
      case 'FIX_VEHICLES':
        nav.goToInventory({
          filter: 'Blocked',
          ids: vehicleIds.length > 0 ? vehicleIds : undefined,
        });
        break;
      case 'ADD_PHOTOS':
        nav.goToInventory({
          filter: 'Needs photos',
          ids: vehicleIds.length > 0 ? vehicleIds : undefined,
        });
        break;
      case 'REVIEW_REMOVALS':
        nav.goToPlatforms();
        break;
      case 'END_EXTERNAL_LISTING':
      case 'COMPLETE_CHANNEL_SETUP':
        if (item.action.channel) {
          nav.goToPlatformDetail(item.action.channel);
        } else {
          nav.goToPlatforms();
        }
        break;
      case 'OPEN_LEADS':
        nav.goToLeads();
        break;
      case 'RETRY_CRM_DELIVERY': {
        const leadRecord = item.records?.find(r => r.type === 'LEAD') || item.records?.[0];
        nav.goToLeads({ leadId: leadRecord?.id });
        break;
      }
      case 'CONTACT_SUPPORT':
        window.location.href = `mailto:support@startergrid.com?subject=Support%20Request%20for%20${encodeURIComponent(item.summary)}`;
        break;
      default:
        break;
    }
  };

  const getActionButtonLabel = (item: AttentionItem): string => {
    switch (item.action.kind) {
      case 'FIX_VEHICLES': return 'Review vehicles';
      case 'ADD_PHOTOS': return 'Add photos';
      case 'REVIEW_REMOVALS': return 'Open take-down card';
      case 'END_EXTERNAL_LISTING': return item.action.channel ? `End listing on ${item.action.channel}` : 'Open channels';
      case 'COMPLETE_CHANNEL_SETUP': return item.action.channel ? `Set up ${item.action.channel}` : 'Open channels';
      case 'RETRY_CRM_DELIVERY': return 'Review leads & retry';
      case 'CONTACT_SUPPORT': return 'Contact support';
      case 'NONE': return 'Waiting on partner';
      default: return 'Review';
    }
  };

  const getOwnerLabel = (owner: string): string => {
    switch (owner) {
      case 'INTERNAL_SUPPORT': return 'DealerGrid Support';
      case 'PARTNER': return 'Channel Partner';
      case 'SYSTEM': return 'DealerGrid Automated System';
      default: return owner;
    }
  };

  return (
    <div className="space-y-4">
      {/* Incomplete areas warning banner */}
      {attention.unavailableAreas && attention.unavailableAreas.length > 0 && (
        <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs">
          <span className="text-base shrink-0">⚠️</span>
          <div>
            <strong className="block font-bold">Partial status inspection</strong>
            <p className="mt-0.5 leading-snug text-amber-900">
              Could not check records for {attention.unavailableAreas.join(', ')}. Some items requiring attention may not be listed until connection is restored.
            </p>
          </div>
        </div>
      )}

      {/* Main Dealership Tasks Card */}
      <section className="surface-card-operator p-5 rounded-xl border border-silver-200 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-silver-100 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-ink-heading">Needs Attention</h3>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              attention.counts.blocking > 0
                ? 'bg-red-100 text-red-800'
                : dealershipItems.length > 0
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              {dealershipItems.length} {dealershipItems.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          {attention.counts.blocking > 0 && (
            <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
              ⛔ {attention.counts.blocking} blocking
            </span>
          )}
        </div>

        {dealershipItems.length === 0 ? (
          <div className="p-4 rounded-xl bg-silver-50 border border-silver-200 text-center space-y-1">
            <span className="text-xl">✅</span>
            <p className="text-xs font-bold text-ink-heading">All dealership tasks caught up</p>
            <p className="text-[11px] text-ink-muted">
              {attention.unavailableAreas.length === 0
                ? 'No active issues found across your vehicles, listings, channels, or leads.'
                : 'No tasks found in available categories.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dealershipItems.map(item => {
              const isExpanded = expandedKeys.has(item.key);
              const isBlocking = item.severity === 'BLOCKING';

              return (
                <div
                  key={item.key}
                  className={`p-4 rounded-xl border transition-all ${
                    isBlocking
                      ? 'border-red-200 bg-red-50/30'
                      : 'border-silver-200 bg-white hover:border-silver-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isBlocking ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white shadow-2xs">
                            Blocking
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-2xs">
                            Action Needed
                          </span>
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted px-1.5 py-0.5 rounded bg-silver-100">
                          {item.area}
                        </span>
                        {item.count > 0 && (
                          <span className="text-[11px] font-medium text-ink-muted">
                            ({item.count} {item.count === 1 ? 'record' : 'records'})
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-ink-heading leading-snug">
                        {item.summary}
                      </h4>

                      <p className="text-xs text-ink-muted leading-relaxed">
                        {item.nextAction}
                      </p>

                      {/* Compact target records preview */}
                      {item.records && item.records.length > 0 && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                          <span className="font-semibold text-ink-body">Target:</span>
                          <span className="truncate">
                            {item.records.slice(0, 3).map(r => r.label).join(', ')}
                            {item.records.length > 3 ? ` +${item.records.length - 3} more` : ''}
                          </span>
                        </div>
                      )}

                      {/* Disabled Action Reason */}
                      {!item.action.enabled && item.action.disabledReason && (
                        <p className="text-[11px] font-semibold text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                          ℹ️ {item.action.disabledReason}
                        </p>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                      {item.action.enabled && (
                        <button
                          type="button"
                          onClick={() => handleAction(item)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm ${
                            isBlocking
                              ? 'bg-red-700 hover:bg-red-800 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          {getActionButtonLabel(item)}
                        </button>
                      )}

                      {item.records && item.records.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(item.key)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2"
                        >
                          {isExpanded ? 'Hide records' : `View records (${item.records.length})`}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Affected Records */}
                  {isExpanded && item.records && item.records.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-silver-200/80 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                          Affected Records (showing up to {item.records.length}):
                        </p>
                        {item.action.enabled && (
                          <button
                            type="button"
                            onClick={() => handleAction(item)}
                            className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline"
                          >
                            Open in {item.area === 'VEHICLES' ? 'Vehicles' : item.area === 'LEADS' ? 'Leads' : 'Channels'} →
                          </button>
                        )}
                      </div>
                      <div className="grid gap-1.5 sm:grid-cols-2 max-h-48 overflow-y-auto">
                        {item.records.map((rec, i) => (
                          <div
                            key={i}
                            className="p-2 rounded-md bg-white border border-silver-200 text-xs flex items-center justify-between gap-2 shadow-2xs"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-ink-heading block truncate">{rec.label}</span>
                              {rec.detail && <span className="text-[10px] text-ink-muted block truncate">{rec.detail}</span>}
                            </div>
                            {rec.channel && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-silver-100 text-ink-muted shrink-0 uppercase">
                                {rec.channel}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Waiting on Others (Collapsed / Secondary) */}
      {waitingItems.length > 0 && (
        <div className="surface-card-operator rounded-xl border border-silver-200 bg-silver-50/50 p-4 shadow-xs">
          <button
            type="button"
            onClick={() => setShowWaiting(!showWaiting)}
            className="w-full flex items-center justify-between text-left text-xs font-semibold text-ink-muted hover:text-ink-heading transition-colors"
          >
            <div className="flex items-center gap-2">
              <span>⏳ Waiting on external actions ({waitingItems.length})</span>
              <span className="text-[10px] font-normal text-silver-500">
                (Support / Partners / Background processes)
              </span>
            </div>
            <span>{showWaiting ? '▲' : '▼'}</span>
          </button>

          {showWaiting && (
            <div className="mt-3 space-y-2 border-t border-silver-200 pt-3">
              <p className="text-[11px] text-ink-muted">
                These items are currently being processed by partners or DealerGrid support. No dealership action is required right now.
              </p>
              {waitingItems.map(item => (
                <div key={item.key} className="p-3 bg-white rounded-lg border border-silver-200 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-ink-heading">{item.summary}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-silver-100 text-ink-muted">
                      {getOwnerLabel(item.owner)}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted">{item.nextAction}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
