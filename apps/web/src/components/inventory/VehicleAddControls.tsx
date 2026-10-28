import { useOperatorRoute } from '@/hooks/useOperatorRoute.ts';
import { useEffect, useState } from 'react';
import { previewBulkVins, commitBulkVins } from '@/lib/api/sdk.ts';
import type { BulkVinPreviewRow } from '@/lib/api/sdk.ts';
import type { CommitImportResponse } from '@/lib/types.ts';
import { VinEntryPanel } from './VinEntryPanel.tsx';
import { BulkVinReviewSidebar } from './BulkVinReviewSidebar.tsx';
import { ImportModal } from './ImportModal.tsx';
import { IngressPanel } from './IngressPanel.tsx';
import { GuidanceNote } from '@/components/guidance/GuidanceNote.tsx';
import { useCategorySchema } from '@/contexts/CategoryContext.tsx';
import { inventoryWorkspaceLabel, usesVehicleIdentifier } from '@/lib/categoryPresentation.ts';

type Panel = 'vin' | 'bulk' | 'source' | null;

type Props = {
  dealerId: string;
  compact?: boolean;
  onVehicleCreated?: (vehicleId: string, stockNumber: string) => void;
  onImportCommitted?: (result?: CommitImportResponse) => void;
};

export function VehicleAddControls({ dealerId, compact, onVehicleCreated, onImportCommitted }: Props) {
  const schema = useCategorySchema();
  const vinEntry = usesVehicleIdentifier(schema);
  const workspace = inventoryWorkspaceLabel(schema);
  const { route } = useOperatorRoute();
  const focusedRunId = new URLSearchParams(window.location.hash.split('?')[1]).get('importRunId');
  useEffect(() => { if (focusedRunId) setPanel('source'); }, [focusedRunId, route.dealerId]);
  const [panel, setPanel] = useState<Panel>(compact || !vinEntry ? null : 'vin');
  const [showCsv, setShowCsv] = useState(false);

  const finish = (result?: CommitImportResponse) => {
    onImportCommitted?.(result);
    if (compact) setPanel(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {vinEntry && (
          <button type="button" className="btn-primary-operator text-xs" onClick={() => setPanel(panel === 'vin' ? null : 'vin')}>
            Add {schema.asset.singular}
          </button>
        )}
        <button type="button" className={vinEntry ? 'btn-secondary-operator text-xs' : 'btn-primary-operator text-xs'} onClick={() => setShowCsv(true)}>
          Import spreadsheet
        </button>
        {vinEntry && (
          <button type="button" className="btn-secondary-operator text-xs" onClick={() => setPanel(panel === 'bulk' ? null : 'bulk')}>
            Paste VINs
          </button>
        )}
        <button
          type="button"
          data-testid="import-from-source"
          className="btn-secondary-operator text-xs"
          onClick={() => setPanel(panel === 'source' ? null : 'source')}
        >
          Import from a source
        </button>
      </div>

      {!vinEntry && (
        <p className="text-xs text-ink-muted">Add {workspace.toLowerCase()} from a spreadsheet. VIN decode is only for vehicles.</p>
      )}

      {vinEntry && panel === 'vin' && (
        <div className="p-4 bg-white border border-silver-200 rounded-xl space-y-2">
          <p className="text-sm font-medium text-ink-heading">Add one vehicle by VIN</p>
          <GuidanceNote>We fill year, make, and model from the VIN. You add price and photos next.</GuidanceNote>
          <VinEntryPanel
            dealerId={dealerId}
            onCreated={(id, stock) => {
              onVehicleCreated?.(id, stock);
              finish();
            }}
          />
        </div>
      )}

      {panel === 'bulk' && (
        <div className="p-4 bg-white border border-silver-200 rounded-xl space-y-2">
          <p className="text-sm font-medium text-ink-heading">Paste a list of VINs</p>
          <GuidanceNote>One VIN per line. We decode them, then you review before they are added.</GuidanceNote>
          <BulkVinPane dealerId={dealerId} onCommitted={finish} />
        </div>
      )}

      {panel === 'source' && (
        <div className="p-4 bg-white border border-silver-200 rounded-xl space-y-2">
          <p className="text-sm font-medium text-ink-heading">Import from a connected source</p>
          <GuidanceNote>Use this for a DMS feed or a JSON inventory file. Spreadsheet imports use Import spreadsheet.</GuidanceNote>
          <IngressPanel dealerId={dealerId} focusedRunId={focusedRunId ?? undefined} onIngestComplete={() => finish()} />
        </div>
      )}

      {showCsv && (
        <ImportModal
          dealerId={dealerId}
          onClose={() => setShowCsv(false)}
          onCommitted={(result) => {
            setShowCsv(false);
            finish(result);
          }}
        />
      )}
    </div>
  );
}

function BulkVinPane({ dealerId, onCommitted }: { dealerId: string; onCommitted: () => void }) {
  const [text, setText] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [rows, setRows] = useState<BulkVinPreviewRow[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: number } | null>(null);

  const vins = text
    .split(/[\n,]+/)
    .map(s => s.trim().toUpperCase().replace(/[\s-]/g, ''))
    .filter(s => s.length > 0);

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={6}
        placeholder={'1HGBH41JXMN109186\n4T1C11AK5MU481526'}
        className="w-full font-mono text-xs px-3 py-2 border border-silver-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-navy-500"
      />
      <button
        type="button"
        onClick={async () => {
          setPreviewing(true);
          setResult(null);
          try {
            const res = await previewBulkVins(dealerId, vins);
            setRows(res.rows);
            setShowSidebar(true);
          } finally {
            setPreviewing(false);
          }
        }}
        disabled={vins.length === 0 || previewing}
        className="px-4 py-2 bg-navy-900 text-white text-xs font-semibold rounded-lg disabled:opacity-40"
      >
        {previewing ? 'Decoding…' : `Review ${vins.length} VIN${vins.length === 1 ? '' : 's'}`}
      </button>
      {result && (
        <p className="text-xs text-ink-body">
          Added {result.created}
          {result.skipped > 0 ? `, skipped ${result.skipped}` : ''}
          {result.errors > 0 ? `, ${result.errors} could not be added` : ''}.
        </p>
      )}
      {showSidebar && (
        <BulkVinReviewSidebar
          dealerId={dealerId}
          previewRows={rows}
          onClose={() => setShowSidebar(false)}
          onCommit={async (commits) => {
            setCommitting(true);
            try {
              const stockNumberMap: Record<string, string> = {};
              for (const row of commits) {
                if (row.stockNumber) stockNumberMap[row.vin] = row.stockNumber;
              }
              setResult(await commitBulkVins(dealerId, commits.map(row => row.vin), stockNumberMap));
              setShowSidebar(false);
              onCommitted();
            } finally {
              setCommitting(false);
            }
          }}
          isCommitting={committing}
        />
      )}
    </div>
  );
}
