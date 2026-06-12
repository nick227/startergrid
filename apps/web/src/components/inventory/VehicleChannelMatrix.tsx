import { useState } from 'react';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import {
  fetchVehicleChannels,
  setVehicleChannelSelection,
} from '@/lib/api/sdk.ts';
import type { VehicleChannelRow, VehicleChannelLiveStatus } from '@/lib/api/sdk.ts';

type Props = {
  dealerId: string;
  vehicleId: string;
  /** Bumped by the parent when vehicle state changes so the matrix refetches. */
  refreshKey?: number;
};

const liveStatusChip: Record<VehicleChannelLiveStatus, { label: string; cls: string }> = {
  LIVE:           { label: 'Live',           cls: 'bg-green-100 text-green-700 border-green-200' },
  QUEUED:         { label: 'Queued',         cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  NEEDS_APPROVAL: { label: 'Needs approval', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  HELD:           { label: 'Held',           cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  FAILED:         { label: 'Failed',         cls: 'bg-red-100 text-red-700 border-red-200' },
  NOT_LIVE:       { label: '—',              cls: 'bg-silver-100 text-ink-muted border-silver-200' },
};

const laneLabel: Record<string, string> = {
  storefront:         'Storefront',
  socialPosting:      'Social',
  catalogSync:        'Catalog',
  marketplaceListing: 'Marketplace',
  partnerFeed:        'Feed',
  leadSync:           'Leads',
};

function ChannelRow({
  row,
  isDraft,
  onToggle,
  toggling,
}: {
  row: VehicleChannelRow;
  isDraft: boolean;
  onToggle: (channelKey: string, selected: boolean) => void;
  toggling: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const chip = liveStatusChip[row.liveStatus];
  const hasIssues = !row.eligible && row.eligibilityIssues.length > 0;
  const showDetail = row.statusDetail || hasIssues;
  const selectionDisabled = toggling || (!row.connected && row.connectionState !== 'BUILT_IN');

  return (
    <>
      <tr className={`border-t border-silver-100 ${!row.selected ? 'opacity-60' : ''}`}>
        <td className="py-2.5 pr-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-ink-heading truncate">{row.channelName}</span>
            {!row.connected && row.connectionState !== 'BUILT_IN' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-silver-100 text-ink-muted border-silver-200 uppercase shrink-0">
                {row.connectionState.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <div className="flex gap-1 mt-0.5">
            {row.lanes.map(lane => (
              <span key={lane} className="text-[9px] text-ink-faint">{laneLabel[lane] ?? lane}</span>
            ))}
          </div>
        </td>
        <td className="py-2.5 px-2 text-center">
          {!row.connected && row.connectionState !== 'BUILT_IN' ? (
            <span className="text-[10px] font-bold text-amber-700">Connect first</span>
          ) : row.eligible ? (
            <span className="text-green-600 text-xs font-bold">✓</span>
          ) : (
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="text-red-600 text-[10px] font-bold hover:underline"
              title={row.eligibilityIssues.join('\n')}
            >
              {row.eligibilityIssues.length} issue{row.eligibilityIssues.length === 1 ? '' : 's'}
            </button>
          )}
        </td>
        <td className="py-2.5 px-2 text-center">
          {/* Selected — dealer preference for this car on this channel */}
          <button
            type="button"
            role="switch"
            aria-checked={row.selected}
            disabled={selectionDisabled}
            onClick={() => onToggle(row.channelKey, !row.selected)}
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors disabled:opacity-50 ${
              row.selected ? 'bg-green-600' : 'bg-silver-300'
            }`}
            title={
              !row.connected && row.connectionState !== 'BUILT_IN'
                ? 'Connect this platform before managing vehicle selection'
                : row.selected
                  ? 'Click to exclude this vehicle from this channel'
                  : 'Click to include this vehicle on this channel'
            }
          >
            <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
              row.selected ? 'translate-x-3.5' : 'translate-x-0.5'
            }`} />
          </button>
        </td>
        <td className="py-2.5 pl-2 text-right">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${chip.cls}`}>
            {isDraft && row.liveStatus === 'NOT_LIVE' ? 'Draft' : chip.label}
          </span>
          {showDetail && (
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="ml-1.5 text-[10px] text-ink-muted hover:text-ink-heading"
              aria-label="Toggle details"
            >
              {expanded ? '▲' : '▼'}
            </button>
          )}
        </td>
      </tr>
      {expanded && showDetail && (
        <tr className="border-t border-silver-50">
          <td colSpan={4} className="pb-2.5 pt-0 px-2">
            <div className="text-[11px] bg-silver-50 rounded-lg p-2.5 space-y-1">
              {row.statusDetail && <p className="text-ink-body">{row.statusDetail}</p>}
              {hasIssues && row.eligibilityIssues.map((issue, i) => (
                <p key={i} className="text-red-700">• {issue}</p>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function VehicleChannelMatrix({ dealerId, vehicleId, refreshKey = 0 }: Props) {
  const { data, loading, error, reload } = useAsyncQuery(
    () => fetchVehicleChannels(dealerId, vehicleId),
    [dealerId, vehicleId, refreshKey],
  );
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const handleToggle = async (channelKey: string, selected: boolean) => {
    setTogglingKey(channelKey);
    setToggleError(null);
    try {
      await setVehicleChannelSelection(dealerId, vehicleId, channelKey, selected);
      reload();
    } catch (e) {
      setToggleError((e as Error).message || 'Could not update channel selection');
    } finally {
      setTogglingKey(null);
    }
  };

  if (loading && !data) {
    return <p className="text-xs text-ink-muted py-4 text-center">Loading channels…</p>;
  }
  if (error) {
    return <p className="text-xs text-red-600 py-4 text-center">{error}</p>;
  }
  if (!data) return null;

  const isDraft = data.listingStatus === 'DRAFT';
  const liveCount = data.channels.filter(c => c.liveStatus === 'LIVE').length;
  const failedCount = data.channels.filter(c => c.liveStatus === 'FAILED').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] text-ink-muted">
          {isDraft
            ? 'Vehicle is in Draft — channels resume when it is marked Ready.'
            : `Live on ${liveCount} of ${data.channels.length} channels${failedCount > 0 ? ` · ${failedCount} failed` : ''}.`}
        </p>
        {toggleError && <span className="text-[11px] text-red-600">{toggleError}</span>}
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="text-[9px] font-bold text-ink-faint uppercase tracking-widest">
            <th className="py-1.5 pr-3 font-bold">Channel</th>
            <th className="py-1.5 px-2 font-bold text-center">Eligible</th>
            <th className="py-1.5 px-2 font-bold text-center">Selected</th>
            <th className="py-1.5 pl-2 font-bold text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.channels.map(row => (
            <ChannelRow
              key={row.channelKey}
              row={row}
              isDraft={isDraft}
              onToggle={handleToggle}
              toggling={togglingKey === row.channelKey}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
