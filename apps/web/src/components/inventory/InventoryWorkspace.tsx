import { useEffect, useRef, useState, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useCategorySchema } from '@/contexts/CategoryContext.tsx';
import { inventoryWorkspaceLabel } from '@/lib/categoryPresentation.ts';
import { EbookEntryPanel } from './EbookEntryPanel.tsx';
import { SongEntryPanel } from './SongEntryPanel.tsx';
import { DigitalArtEntryPanel } from './DigitalArtEntryPanel.tsx';
import { VideoEntryPanel } from './VideoEntryPanel.tsx';

type Tab = 'browse' | 'attention' | 'sold';

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

const TABS: { key: Tab; label: string }[] = [
  { key: 'browse', label: 'Active' },
  { key: 'attention', label: 'Needs attention' },
  { key: 'sold', label: 'Sold / Removed' },
];

type Props = {
  dealerId: string;
  initialTab?: Tab;
  browseContent?: ReactNode;
  attentionContent?: ReactNode;
  soldContent?: ReactNode;
  tabCounts?: Partial<Record<Tab, number>>;
};

export function InventoryWorkspace({
  dealerId,
  initialTab = 'browse',
  browseContent,
  attentionContent,
  soldContent,
  tabCounts,
}: Props) {
  const workspace = inventoryWorkspaceLabel(useCategorySchema());
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const chosen = useRef(false);
  const setTab = (tab: Tab) => {
    chosen.current = true;
    setActiveTab(tab);
  };
  useEffect(() => {
    if (!chosen.current) setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <WorkspaceContext.Provider value={{ dealerId, activeTab, setTab }}>
      <div>
        <div className="border-b border-silver-200 bg-white">
          <nav className="flex overflow-x-auto scrollbar-none" aria-label={`${workspace} lists`}>
            {TABS.map(tab => {
              const count = tabCounts?.[tab.key];
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTab(tab.key)}
                  className={`relative flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 ${
                    isActive
                      ? 'border-navy-900 text-navy-900'
                      : 'border-transparent text-ink-muted hover:text-ink-body hover:border-silver-300'
                  }`}
                >
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
        <div className="pt-5">
          {activeTab === 'browse' && (browseContent ?? <EmptySlot>No vehicles in this list yet.</EmptySlot>)}
          {activeTab === 'attention' && (attentionContent ?? <EmptySlot>Nothing needs a fix right now.</EmptySlot>)}
          {activeTab === 'sold' && (soldContent ?? <EmptySlot>Sold and removed vehicles appear here.</EmptySlot>)}
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}

function EmptySlot({ children }: { children: ReactNode }) {
  return <div className="py-12 text-center text-sm text-ink-muted">{children}</div>;
}

type DigitalAddControlsProps = {
  dealerId: string;
  onItemCreated?: (itemId: string, stockNumber: string) => void;
};

export function EbookAddControls({ dealerId, onItemCreated }: DigitalAddControlsProps) {
  return (
    <div className="max-w-lg p-4 bg-white border border-silver-200 rounded-xl">
      <h3 className="text-sm font-semibold text-ink-heading mb-3">Add ebook</h3>
      <EbookEntryPanel dealerId={dealerId} onCreated={onItemCreated} />
    </div>
  );
}

export function SongAddControls({ dealerId, onItemCreated }: DigitalAddControlsProps) {
  return (
    <div className="max-w-lg p-4 bg-white border border-silver-200 rounded-xl">
      <h3 className="text-sm font-semibold text-ink-heading mb-3">Add release</h3>
      <SongEntryPanel dealerId={dealerId} onCreated={onItemCreated} />
    </div>
  );
}

export function DigitalArtAddControls({ dealerId, onItemCreated }: DigitalAddControlsProps) {
  return (
    <div className="max-w-lg p-4 bg-white border border-silver-200 rounded-xl">
      <h3 className="text-sm font-semibold text-ink-heading mb-3">Add artwork</h3>
      <DigitalArtEntryPanel dealerId={dealerId} onCreated={onItemCreated} />
    </div>
  );
}

export function VideoAddControls({ dealerId, onItemCreated }: DigitalAddControlsProps) {
  return (
    <div className="max-w-lg p-4 bg-white border border-silver-200 rounded-xl">
      <h3 className="text-sm font-semibold text-ink-heading mb-3">Add video</h3>
      <VideoEntryPanel dealerId={dealerId} onCreated={onItemCreated} />
    </div>
  );
}
