import { SkeletonBlock } from './SkeletonBlock.tsx';

type Props = { count?: number; label?: string };

export function SkeletonGrid({ count = 6, label = 'Loading vehicles' }: Props) {
  return (
    <div className="mp-grid-vehicles" aria-busy="true" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="mp-card overflow-hidden">
          <SkeletonBlock className="mp-aspect-vehicle w-full rounded-none" />
          <div className="space-y-3 p-4">
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-3 w-1/2" />
            <SkeletonBlock className="h-6 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2" aria-busy="true" aria-label="Loading vehicle">
      <SkeletonBlock className="mp-aspect-vehicle w-full rounded-2xl" />
      <div className="space-y-4">
        <SkeletonBlock className="h-6 w-24 rounded-full" />
        <SkeletonBlock className="h-8 w-3/4" />
        <SkeletonBlock className="h-10 w-1/3" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonBlock key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <SkeletonBlock className="h-28 rounded-2xl" />
      </div>
    </div>
  );
}

export function DealerHeaderSkeleton() {
  return (
    <div className="mp-card overflow-hidden" aria-busy="true" aria-label="Loading dealer">
      <SkeletonBlock className="h-32 w-full rounded-none sm:h-36" />
      <div className="p-4">
        <SkeletonBlock className="h-4 w-40" />
      </div>
    </div>
  );
}
