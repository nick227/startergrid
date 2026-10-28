import { ApparelEntryPanel } from './ApparelEntryPanel.tsx';
import { EbookEntryPanel } from './EbookEntryPanel.tsx';
import { PhysicalRecordEntryPanel } from './PhysicalRecordEntryPanel.tsx';
import { SongEntryPanel } from './SongEntryPanel.tsx';
import { DigitalArtEntryPanel } from './DigitalArtEntryPanel.tsx';
import { VideoEntryPanel } from './VideoEntryPanel.tsx';

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

export function ApparelAddControls({ dealerId, onItemCreated }: DigitalAddControlsProps) {
  return (
    <div className="max-w-lg p-4 bg-white border border-silver-200 rounded-xl">
      <h3 className="text-sm font-semibold text-ink-heading mb-3">Add garment</h3>
      <ApparelEntryPanel dealerId={dealerId} onCreated={onItemCreated} />
    </div>
  );
}

export function SongAddControls({ dealerId, onItemCreated }: DigitalAddControlsProps) {
  return (
    <div className="space-y-3 max-w-lg">
      <div className="p-4 bg-white border border-silver-200 rounded-xl">
        <h3 className="text-sm font-semibold text-ink-heading mb-1">Add physical record</h3>
        <p className="text-xs text-ink-muted mb-3">Vinyl, CD, and other merchandise. This is separate from a digital release.</p>
        <PhysicalRecordEntryPanel dealerId={dealerId} onCreated={onItemCreated} />
      </div>
      <div className="p-4 bg-white border border-silver-200 rounded-xl">
        <h3 className="text-sm font-semibold text-ink-heading mb-1">Add digital release</h3>
        <p className="text-xs text-ink-muted mb-3">Digital distribution stays off Marketplace.</p>
        <SongEntryPanel dealerId={dealerId} onCreated={onItemCreated} />
      </div>
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
