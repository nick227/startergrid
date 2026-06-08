import { useCallback, useState } from 'react';
import { ListingImage } from './ListingImage.tsx';

type Props = {
  images: string[];
  alt: string;
};

export function ListingGallery({ images, alt }: Props) {
  const [active, setActive] = useState(0);
  const count = images.length;
  const activeSrc = count > 0 ? images[active] : null;

  const move = useCallback((delta: number) => {
    if (count <= 1) return;
    setActive(i => (i + delta + count) % count);
  }, [count]);

  return (
    <section aria-label="Photos">
      <ListingImage src={activeSrc} alt={alt} variant="hero" className="rounded-2xl" />

      {count > 1 && (
        <>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Photo {active + 1} of {count}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => move(-1)} className="mp-btn-secondary px-3 py-1.5 text-xs">
                Previous
              </button>
              <button type="button" onClick={() => move(1)} className="mp-btn-secondary px-3 py-1.5 text-xs">
                Next
              </button>
            </div>
          </div>

          <div
            className="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label="Photo thumbnails"
          >
            {images.map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`Show photo ${i + 1}`}
                onClick={() => setActive(i)}
                className={`mp-focus h-16 w-20 shrink-0 snap-start overflow-hidden rounded-lg border-2 transition ${
                  i === active ? 'border-blue-500' : 'border-transparent hover:border-slate-300'
                }`}
              >
                <ListingImage src={url} alt="" variant="thumb" decorative className="h-full w-full" />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
