import { useState, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { previewBulkVins, commitBulkVins } from '@/lib/api/sdk.ts';
import type { BulkVinPreviewRow } from '@/lib/api/sdk.ts';
import { VinEntryPanel } from './VinEntryPanel.tsx';

type Tab = 'browse' | 'attention' | 'recent' | 'sold';

type WorkspaceContextValue = {
  dealerId: string;
  activeTab: Tab;
  setTab: (tab: Tab) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useInventoryWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useInventoryWorkspace must be inside InventoryWorkspace');
  return ctx;
}

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'browse',    label: 'Browse',           icon: '◻' },
  { key: 'attention', label: 'Needs Attention',   icon: '!' },
  { key: 'recent',    label: 'Recently Changed',  icon: '✎' },
  { key: 'sold',      label: 'Sold / Removed',    icon: '✕' },
];

type Props = {
  dealerId: string;
  initialTab?: Tab;
  /** Slot for the browse tab content (pass in your InventoryAssetList etc.) */
  browseContent?: ReactNode;
  /** Slot for the attention tab */
  attentionContent?: ReactNode;
  /** Slot for the recently changed tab */
  recentContent?: ReactNode;
  /** Slot for the sold/removed tab */
  soldContent?: ReactNode;
  /** Badge counts for tab indicators */
  tabCounts?: Partial<Record<Tab, number>>;
};

export function InventoryWorkspace({
  dealerId,
  initialTab = 'browse',
  browseContent,
  attentionContent,
  recentContent,
  soldContent,
  tabCounts,
}: Props) {
  const [activeTab, setTab] = useState<Tab>(initialTab);

  return (
    <WorkspaceContext.Provider value={{ dealerId, activeTab, setTab }}>
      <div className="space-y-0">
        {/* Tab bar */}
        <div className="border-b border-silver-200 bg-white">
          <nav className="flex overflow-x-auto scrollbar-none gap-0">
            {TABS.map(tab => {
              const count = tabCounts?.[tab.key];
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTab(tab.key)}
                  className={`relative flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-navy-900 text-navy-900'
                      : 'border-transparent text-ink-muted hover:text-ink-body hover:border-silver-300'
                  }`}
                >
                  <span className="opacity-60">{tab.icon}</span>
                  {tab.label}
                  {count !== undefined && count > 0 && (
                    <span className={`ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                      tab.key === 'attention' ? 'bg-red-500 text-white' : 'bg-navy-100 text-navy-700'
                    }`}>
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div className="pt-5">
          {activeTab === 'browse' && (
            <div>{browseContent ?? <EmptySlot>Browse your inventory here.</EmptySlot>}</div>
          )}

          {activeTab === 'attention' && (
            <div>{attentionContent ?? <EmptySlot>Vehicles needing attention will appear here.</EmptySlot>}</div>
          )}

          {activeTab === 'recent' && (
            <div>{recentContent ?? <EmptySlot>Recently updated vehicles appear here.</EmptySlot>}</div>
          )}

          {activeTab === 'sold' && (
            <div>{soldContent ?? <EmptySlot>Sold and removed vehicles appear here.</EmptySlot>}</div>
          )}
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}

function EmptySlot({ children }: { children: ReactNode }) {
  return (
    <div className="py-12 text-center text-sm text-ink-muted">{children}</div>
  );
}

export type VehicleAddControlsProps = {
  dealerId: string;
  onVehicleCreated?: (vehicleId: string, stockNumber: string) => void;
  onCreatedGoToBrowse?: () => void;
};

type AddMode = 'vin' | 'bulk' | 'csv';

export function VehicleAddControls({ dealerId, onVehicleCreated, onCreatedGoToBrowse }: VehicleAddControlsProps) {
  const [mode, setMode] = useState<AddMode>('vin');

  const handleCreated = (vehicleId: string, stockNumber: string) => {
    onVehicleCreated?.(vehicleId, stockNumber);
    onCreatedGoToBrowse?.();
  };

  return (
    <div className="max-w-xl space-y-4">
      {/* Mode switcher */}
      <div className="flex rounded-lg border border-silver-200 bg-surface-raised overflow-hidden">
        {([
          { key: 'vin',  label: 'Single VIN' },
          { key: 'bulk', label: 'Bulk VINs' },
          { key: 'csv',  label: 'CSV Import' },
        ] as { key: AddMode; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              mode === key
                ? 'bg-navy-900 text-white'
                : 'text-ink-muted hover:text-ink-body'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'vin' && (
        <div className="p-4 bg-white border border-silver-200 rounded-xl">
          <h3 className="text-sm font-semibold text-ink-body mb-3">Add a vehicle by VIN</h3>
          <VinEntryPanel dealerId={dealerId} onCreated={handleCreated} />
        </div>
      )}

      {mode === 'bulk' && (
        <div className="p-4 bg-white border border-silver-200 rounded-xl">
          <h3 className="text-sm font-semibold text-ink-body mb-1">Bulk VIN paste</h3>
          <p className="text-xs text-ink-muted mb-3">Paste one VIN per line — up to 500 at a time.</p>
          <BulkVinPane dealerId={dealerId} onCommitted={() => onCreatedGoToBrowse?.()} />
        </div>
      )}

      {mode === 'csv' && (
        <div className="p-4 bg-white border border-silver-200 rounded-xl">
          <h3 className="text-sm font-semibold text-ink-body mb-1">CSV Import</h3>
          <p className="text-xs text-ink-muted">Use the Import CSV button in the main toolbar to upload a dealer export.</p>
        </div>
      )}
    </div>
  );
}

function BulkVinPane({ dealerId, onCommitted }: { dealerId: string; onCommitted: () => void }) {
  const [text, setText] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [rows, setRows] = useState<BulkVinPreviewRow[]>([]);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: number } | null>(null);

  const vins = text
    .split(/[\n,]+/)
    .map(s => s.trim().toUpperCase().replace(/[\s-]/g, ''))
    .filter(s => s.length > 0);

  const handlePreview = async () => {
    setPreviewing(true);
    setRows([]);
    setResult(null);
    try {
      const res = await previewBulkVins(dealerId, vins);
      setRows(res.rows);
    } finally {
      setPreviewing(false);
    }
  };

  const handleCommit = async () => {
    setCommitting(true);
    const goodVins = rows.filter(r => r.status === 'OK').map(r => r.vin);
    try {
      const res = await commitBulkVins(dealerId, goodVins);
      setResult(res);
      onCommitted();
    } finally {
      setCommitting(false);
    }
  };

  const okCount = rows.filter(r => r.status === 'OK').length;
  const errorCount = rows.filter(r => r.status !== 'OK').length;

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={6}
        placeholder="1HGBH41JXMN109186&#10;4T1C11AK5MU481526&#10;..."
        className="w-full font-mono text-xs px-3 py-2 border border-silver-200 rounded-lg bg-white resize-y focus:outline-none focus:ring-2 focus:ring-navy-500"
      />

      {rows.length === 0 && (
        <button
          type="button"
          onClick={handlePreview}
          disabled={vins.length === 0 || previewing}
          className="px-4 py-2 bg-navy-900 text-white text-xs font-semibold rounded-lg disabled:opacity-40"
        >
          {previewing ? 'Checking…' : `Preview ${vins.length} VIN${vins.length !== 1 ? 's' : ''}`}
        </button>
      )}

      {rows.length > 0 && !result && (
        <div className="space-y-2">
          <p className="text-xs text-ink-muted">
            <span className="text-green-600 font-medium">{okCount} valid</span>
            {errorCount > 0 && <span className="text-red-600 font-medium"> · {errorCount} errors</span>}
          </p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {rows.map(row => (
              <div key={row.vin} className={`flex items-center gap-2 text-[11px] px-2 py-1 rounded ${
                row.status === 'OK' ? 'bg-green-50 text-green-700' :
                row.status === 'DUPLICATE' ? 'bg-amber-50 text-amber-700' :
                'bg-red-50 text-red-700'
              }`}>
                <span className="font-mono">{row.vin}</span>
                <span>{row.status === 'OK' ? '✓' : row.error ?? row.status}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCommit}
              disabled={okCount === 0 || committing}
              className="px-4 py-2 bg-navy-900 text-white text-xs font-semibold rounded-lg disabled:opacity-40"
            >
              {committing ? 'Importing…' : `Import ${okCount} vehicle${okCount !== 1 ? 's' : ''}`}
            </button>
            <button type="button" onClick={() => { setRows([]); setText(''); }} className="px-4 py-2 text-xs text-ink-muted border border-silver-200 rounded-lg">
              Reset
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
          Import complete: <strong>{result.created}</strong> created
          {result.skipped > 0 && <>, {result.skipped} skipped</>}
          {result.errors > 0 && <>, <span className="text-red-600">{result.errors} errors</span></>}
        </div>
      )}
    </div>
  );
}
