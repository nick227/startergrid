import { useMemo } from 'react';
import type { MarketplaceMediaItem, VehicleMediaTour } from '@dealer-marketplace/client';
import { VehicleTourStep } from '@dealer-marketplace/client';
import { VdpMediaLightbox } from './VdpMediaLightbox.tsx';

type Props = {
  tour: VehicleMediaTour;
  items: MarketplaceMediaItem[];
  stepIndex: number;
  alt: string;
  onStepIndexChange: (index: number) => void;
  onExit: () => void;
  onInquiry: () => void;
};

const STEP_TONE: Record<VehicleTourStep.stepType, string> = {
  [VehicleTourStep.stepType.HIGHLIGHT]: 'bg-status-info-bg text-status-info-text border-status-info-border',
  [VehicleTourStep.stepType.ISSUE]: 'bg-status-warning-bg text-status-warning-text border-status-warning-border',
  [VehicleTourStep.stepType.NEUTRAL]: 'bg-silver-100 text-ink-muted border-silver-200',
};

export function VdpTourMode({ tour, items, stepIndex, alt, onStepIndexChange, onExit, onInquiry }: Props) {
  const steps = useMemo(
    () => [...tour.steps].sort((a, b) => a.sortOrder - b.sortOrder),
    [tour.steps],
  );
  const itemsById = useMemo(() => new Map(items.map(item => [item.id, item])), [items]);
  const resolved = steps
    .map(step => ({ step, item: itemsById.get(step.mediaId) ?? null }))
    .filter((entry): entry is { step: typeof steps[number]; item: MarketplaceMediaItem } => entry.item !== null);

  if (resolved.length === 0) return null;

  const safeIndex = Math.min(stepIndex, resolved.length - 1);
  const current = resolved[safeIndex]!;
  const lightboxItems = resolved.map(entry => entry.item);
  const isLast = safeIndex === resolved.length - 1;

  return (
    <VdpMediaLightbox
      items={lightboxItems}
      index={safeIndex}
      alt={alt}
      onIndexChange={onStepIndexChange}
      onClose={onExit}
      header={(
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-slate-300">{tour.title ?? 'Tour'}</p>
          <p className="truncate text-sm font-semibold text-white">{current.step.label}</p>
        </div>
      )}
      footer={(
        <div className="space-y-3 text-white">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-pill border px-2.5 py-0.5 text-xs font-semibold ${STEP_TONE[current.step.stepType]}`}>
              {current.step.stepType}
            </span>
            <span className="text-xs text-slate-300">{safeIndex + 1} / {resolved.length}</span>
          </div>
          {current.step.note && <p className="text-sm text-slate-200">{current.step.note}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="mp-btn-secondary px-3 py-1.5 text-xs"
              disabled={safeIndex === 0}
              onClick={() => onStepIndexChange(safeIndex - 1)}
            >
              Back
            </button>
            {!isLast ? (
              <button type="button" className="mp-btn-primary px-3 py-1.5 text-xs" onClick={() => onStepIndexChange(safeIndex + 1)}>
                Next
              </button>
            ) : (
              <button type="button" className="mp-btn-primary px-3 py-1.5 text-xs" onClick={onInquiry}>
                Send inquiry
              </button>
            )}
            <button type="button" className="mp-btn-ghost px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10" onClick={onExit}>
              Exit tour
            </button>
          </div>
        </div>
      )}
    />
  );
}
