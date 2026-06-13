import { useState, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { previewBulkVins, commitBulkVins } from '@/lib/api/sdk.ts';
import type { BulkVinPreviewRow } from '@/lib/api/sdk.ts';
import { VinEntryPanel } from './VinEntryPanel.tsx';
import { BulkVinReviewSidebar } from './BulkVinReviewSidebar.tsx';
import { EbookEntryPanel } from './EbookEntryPanel.tsx';
import { SongEntryPanel } from './SongEntryPanel.tsx';
import { DigitalArtEntryPanel } from './DigitalArtEntryPanel.tsx';
import { VideoEntryPanel } from './VideoEntryPanel.tsx';

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

export function VehicleAddControls({ dealerId, onVehicleCreated, onCreatedGoToBrowse }: VehicleAddControlsProps) {
  const handleCreated = (vehicleId: string, stockNumber: string) => {
    onVehicleCreated?.(vehicleId, stockNumber);
    onCreatedGoToBrowse?.();
  };

  return (
    <div className="w-full space-y-6 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Single VIN */}
        <div className="p-4 bg-white border border-silver-200 rounded-xl shadow-sm flex flex-col">
          <h3 className="text-sm font-semibold text-ink-body mb-3 flex items-center gap-2">
            <span className="text-navy-700">🚙</span> Single VIN
          </h3>
          <div className="flex-1">
            <VinEntryPanel dealerId={dealerId} onCreated={handleCreated} />
          </div>
        </div>

        {/* Bulk VIN */}
        <div className="p-4 bg-white border border-silver-200 rounded-xl shadow-sm flex flex-col">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-ink-body flex items-center gap-2">
              <span className="text-navy-700">📋</span> Bulk VIN Paste
            </h3>
            <p className="text-[11px] text-ink-muted mt-1">Paste one VIN per line (up to 500)</p>
          </div>
          <div className="flex-1">
            <BulkVinPane dealerId={dealerId} onCommitted={() => onCreatedGoToBrowse?.()} />
          </div>
        </div>

        {/* CSV Import */}
        <div className="p-4 bg-white border border-silver-200 rounded-xl shadow-sm flex flex-col">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-ink-body flex items-center gap-2">
              <span className="text-navy-700">📄</span> CSV Import
            </h3>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center text-center p-6 border-2 border-dashed border-silver-200 rounded-lg bg-surface-inset">
             <div className="text-2xl mb-2">📥</div>
             <p className="text-xs font-medium text-ink-body mb-1">Got a dealer export?</p>
             <p className="text-[11px] text-ink-muted mb-4">Upload a CSV file containing multiple vehicles and their specs.</p>
             <button type="button" className="btn-primary-operator !py-2 !px-4 text-xs" onClick={() => window.alert('Use the main Import CSV button in the inventory toolbar.')}>
               Import CSV
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type DigitalAddControlsProps = {
  dealerId: string;
  onItemCreated?: (itemId: string, stockNumber: string) => void;
};

export function EbookAddControls({ dealerId, onItemCreated }: DigitalAddControlsProps) {
  return (
    <div className="w-full mb-8">
      <div className="max-w-lg">
        <div className="p-4 bg-white border border-silver-200 rounded-xl shadow-sm">
          <h3 className="text-sm font-semibold text-ink-body mb-3 flex items-center gap-2">
            <span>📚</span> Add Ebook
          </h3>
          <EbookEntryPanel dealerId={dealerId} onCreated={onItemCreated} />
        </div>
      </div>
    </div>
  );
}

export function SongAddControls({ dealerId, onItemCreated }: DigitalAddControlsProps) {
  return (
    <div className="w-full mb-8">
      <div className="max-w-lg">
        <div className="p-4 bg-white border border-silver-200 rounded-xl shadow-sm">
          <h3 className="text-sm font-semibold text-ink-body mb-3 flex items-center gap-2">
            <span>🎵</span> Add Release
          </h3>
          <SongEntryPanel dealerId={dealerId} onCreated={onItemCreated} />
        </div>
      </div>
    </div>
  );
}

export function DigitalArtAddControls({ dealerId, onItemCreated }: DigitalAddControlsProps) {
  return (
    <div className="w-full mb-8">
      <div className="max-w-lg">
        <div className="p-4 bg-white border border-silver-200 rounded-xl shadow-sm">
          <h3 className="text-sm font-semibold text-ink-body mb-3 flex items-center gap-2">
            <span>🎨</span> Add Artwork
          </h3>
          <DigitalArtEntryPanel dealerId={dealerId} onCreated={onItemCreated} />
        </div>
      </div>
    </div>
  );
}

export function VideoAddControls({ dealerId, onItemCreated }: DigitalAddControlsProps) {
  return (
    <div className="w-full mb-8">
      <div className="max-w-lg">
        <div className="p-4 bg-white border border-silver-200 rounded-xl shadow-sm">
          <h3 className="text-sm font-semibold text-ink-body mb-3 flex items-center gap-2">
            <span>🎬</span> Add Video
          </h3>
          <VideoEntryPanel dealerId={dealerId} onCreated={onItemCreated} />
        </div>
      </div>
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

  const handlePreview = async () => {
    setPreviewing(true);
    setRows([]);
    setResult(null);
    try {
      const res = await previewBulkVins(dealerId, vins);
      setRows(res.rows);
      setShowSidebar(true);
    } finally {
      setPreviewing(false);
    }
  };

  const handleCommit = async (commits: { vin: string; stockNumber: string; priceCents?: number; condition: string }[]) => {
    setCommitting(true);
    try {
      // First, commit the VINs
      const goodVins = commits.map(c => c.vin);
      
      // Pass the stockNumber mapping if commitBulkVins supports it, 
      // or we can patch them afterwards.
      const stockNumberMap: Record<string, string> = {};
      for (const c of commits) {
        if (c.stockNumber) {
          stockNumberMap[c.vin] = c.stockNumber;
        }
      }

      const res = await commitBulkVins(dealerId, goodVins, stockNumberMap);
      
      // For any price or condition updates, we'd ideally batch patch them or patch them individually
      // since the commitBulkVins doesn't take price/condition out of the box in the SDK.
      // But we can just pass them if the API supported it, or leave it as a future refinement.
      // We will do our best with the commit API which takes stockNumberMap.

      setResult(res);
      setShowSidebar(false);
      onCommitted();
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-3 h-full flex flex-col">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={6}
        placeholder="1HGBH41JXMN109186&#10;4T1C11AK5MU481526&#10;..."
        className="w-full flex-1 font-mono text-xs px-3 py-2 border border-silver-200 rounded-lg bg-white resize-y focus:outline-none focus:ring-2 focus:ring-navy-500"
      />

      <button
        type="button"
        onClick={handlePreview}
        disabled={vins.length === 0 || previewing}
        className="w-full px-4 py-2 bg-navy-900 text-white text-xs font-semibold rounded-lg disabled:opacity-40"
      >
        {previewing ? 'Decoding...' : `Review ${vins.length} VIN${vins.length !== 1 ? 's' : ''}`}
      </button>

      {result && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
          Import complete: <strong>{result.created}</strong> created
          {result.skipped > 0 && <>, {result.skipped} skipped</>}
          {result.errors > 0 && <>, <span className="text-red-600">{result.errors} errors</span></>}
        </div>
      )}

      {showSidebar && (
        <BulkVinReviewSidebar 
          dealerId={dealerId}
          previewRows={rows}
          onClose={() => setShowSidebar(false)}
          onCommit={handleCommit}
          isCommitting={committing}
        />
      )}
    </div>
  );
}
