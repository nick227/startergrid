const WIDTHS = [90, 70, 85, 65, 80, 75, 88, 68];

type Props = {
  rows?: number;
};

export function Skeleton({ rows = 4 }: Props) {
  return (
    <div className="p-4 space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 h-7">
          <div className="w-3.5 h-3.5 bg-silver-100 rounded animate-pulse shrink-0" />
          <div
            className="h-3 bg-silver-100 rounded animate-pulse"
            style={{ width: `${WIDTHS[i % WIDTHS.length]}%` }}
          />
        </div>
      ))}
    </div>
  );
}
