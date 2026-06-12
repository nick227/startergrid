import type { VdpMediaSlotMap } from '../../../lib/vdpMediaSlotMap.ts';
import { kindBadge } from '../../../lib/vdpMediaLabels.ts';
import { ListingImage } from '../../ui/ListingImage.tsx';

type Props = {
  map: VdpMediaSlotMap;
  alt: string;
  onOpenItem: (itemId: string) => void;
};

function MosaicCell({
  label,
  item,
  alt,
  className,
  onOpen,
}: {
  label: string;
  item: VdpMediaSlotMap['mosaic'][number]['item'];
  alt: string;
  className: string;
  onOpen: () => void;
}) {
  const badge = item ? kindBadge(item.kind) : null;

  if (!item) {
    return (
      <div className={`relative overflow-hidden rounded-xl border border-dashed border-silver-300 bg-surface-inset ${className}`}>
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{label}</span>
          <span className="text-xs text-ink-muted">Not available</span>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`mp-focus relative overflow-hidden rounded-xl border border-silver-200 bg-surface-inset ${className}`}
      aria-label={`View ${label}`}
      onClick={onOpen}
    >
      <ListingImage src={item.posterUrl ?? item.url} alt={`${alt} — ${label}`} variant="thumb" className="h-full w-full rounded-xl" imgClassName="h-full w-full" />
      {badge && (
        <span className="absolute left-2 top-2 rounded-pill bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

export function VdpGalleryMosaic({ map, alt, onOpenItem }: Props) {
  const [hero, s2, s3, s4, s5, s6, s7, s8, s9, s10] = map.mosaic;

  return (
    <section aria-label="Vehicle gallery">
      <div className="grid grid-cols-4 grid-rows-2 gap-2">
        <MosaicCell label={hero!.label} item={hero!.item} alt={alt} className="col-span-2 row-span-2" onOpen={() => hero!.item && onOpenItem(hero!.item.id)} />
        <MosaicCell label={s2!.label} item={s2!.item} alt={alt} className="" onOpen={() => s2!.item && onOpenItem(s2!.item.id)} />
        <MosaicCell label={s3!.label} item={s3!.item} alt={alt} className="" onOpen={() => s3!.item && onOpenItem(s3!.item.id)} />
        <MosaicCell label={s4!.label} item={s4!.item} alt={alt} className="" onOpen={() => s4!.item && onOpenItem(s4!.item.id)} />
        <MosaicCell label={s5!.label} item={s5!.item} alt={alt} className="" onOpen={() => s5!.item && onOpenItem(s5!.item.id)} />
        <MosaicCell label={s6!.label} item={s6!.item} alt={alt} className="" onOpen={() => s6!.item && onOpenItem(s6!.item.id)} />
        <MosaicCell label={s7!.label} item={s7!.item} alt={alt} className="" onOpen={() => s7!.item && onOpenItem(s7!.item.id)} />
        <MosaicCell label={s8!.label} item={s8!.item} alt={alt} className="" onOpen={() => s8!.item && onOpenItem(s8!.item.id)} />
        <MosaicCell label={s9!.label} item={s9!.item} alt={alt} className="" onOpen={() => s9!.item && onOpenItem(s9!.item.id)} />
        <MosaicCell label={s10!.label} item={s10!.item} alt={alt} className="col-span-4" onOpen={() => s10!.item && onOpenItem(s10!.item.id)} />
      </div>

      {map.overflow.length > 0 && (
        <div className="mt-3">
          <p className="mp-label mb-2 text-ink-faint">Additional media</p>
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
            {map.overflow.map(item => (
              <button
                key={item.id}
                type="button"
                className="mp-focus relative h-20 w-28 shrink-0 snap-start overflow-hidden rounded-lg border border-silver-200"
                aria-label={`View additional ${kindBadge(item.kind) ?? 'media'}`}
                onClick={() => onOpenItem(item.id)}
              >
                <ListingImage src={item.posterUrl ?? item.url} alt="" decorative variant="thumb" className="h-full w-full" imgClassName="h-full w-full" />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
