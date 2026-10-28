import { useState } from 'react';
import { Button } from '@/components/ui';
import type { VelocityVehicleItem } from '@/lib/api/velocityApi.ts';

type Props = {
  vehicleId: string;
  missingPrice: boolean;
  missingPhotos: boolean;
  sold: boolean;
  saving: boolean;
  relisting: boolean;
  onSavePrice: (id: string, price: string) => void;
  onUploadPhotos: (id: string, files: FileList) => void;
  onAddPhotoUrl: (id: string, url: string) => void;
  onRelist: (id: string) => void;
  reprice: VelocityVehicleItem | null;
  onReviewReprice: (item: VelocityVehicleItem) => void;
};

export function InventoryLotActions({
  vehicleId, missingPrice, missingPhotos, sold, saving, relisting,
  onSavePrice, onUploadPhotos, onAddPhotoUrl, onRelist, reprice, onReviewReprice,
}: Props) {
  const [price, setPrice] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [showUrl, setShowUrl] = useState(false);

  if (!missingPrice && !missingPhotos && !sold && !reprice) return null;

  return (
    <div className="space-y-2" onClick={event => event.stopPropagation()}>
      {missingPrice && (
        <form
          className="flex items-center gap-1.5"
          onSubmit={event => {
            event.preventDefault();
            onSavePrice(vehicleId, price);
          }}
        >
          <input
            type="text"
            value={price}
            placeholder="Price"
            aria-label="Price"
            onChange={event => setPrice(event.target.value)}
            className="field-input h-8 min-h-0 py-1 text-xs"
          />
          <Button type="submit" size="sm" disabled={saving || price.trim() === ''} loading={saving} loadingLabel="Saving…">
            Save
          </Button>
        </form>
      )}
      {missingPhotos && !showUrl && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() => document.getElementById(`lot-photo-${vehicleId}`)?.click()}
          >
            {saving ? 'Uploading…' : 'Add photos'}
          </Button>
          <input
            id={`lot-photo-${vehicleId}`}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={event => {
              if (event.target.files) onUploadPhotos(vehicleId, event.target.files);
              event.target.value = '';
            }}
          />
          <Button variant="ghost" size="sm" onClick={() => setShowUrl(true)}>Add URL</Button>
        </div>
      )}
      {missingPhotos && showUrl && (
        <form
          className="flex items-center gap-1.5"
          onSubmit={event => {
            event.preventDefault();
            onAddPhotoUrl(vehicleId, photoUrl);
          }}
        >
          <input
            type="url"
            value={photoUrl}
            placeholder="Photo URL"
            aria-label="Photo URL"
            onChange={event => setPhotoUrl(event.target.value)}
            className="field-input h-8 min-h-0 py-1 text-xs"
          />
          <Button type="submit" size="sm" disabled={saving || photoUrl.trim() === ''} loading={saving} loadingLabel="Adding…">
            Add
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowUrl(false)}>Cancel</Button>
        </form>
      )}
      {reprice?.suggestedPriceCents != null && (
        <Button variant="secondary" size="sm" onClick={() => onReviewReprice(reprice)}>
          Review price
        </Button>
      )}
      {sold && (
        <Button variant="primary" size="sm" disabled={relisting} loading={relisting} loadingLabel="Relisting…" onClick={() => onRelist(vehicleId)}>
          Relist vehicle
        </Button>
      )}
    </div>
  );
}
