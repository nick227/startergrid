export function OpsRowCardSkeleton() {
  return (
    <div className="surface-card-operator p-4 sm:p-5 flex flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 space-y-2">
          <div className="w-1/3 h-5 mb-1 bg-silver-100 rounded animate-pulse" />
          <div className="w-1/2 h-3 bg-silver-100 rounded animate-pulse" />
        </div>
        <div className="shrink-0 w-20">
          <div className="h-6 w-full rounded-full bg-silver-100 animate-pulse" />
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-6 gap-y-3 pt-3 border-t border-silver-200/50">
        <div className="space-y-1">
          <div className="w-16 h-2 bg-silver-100 rounded animate-pulse" />
          <div className="w-24 h-4 bg-silver-100 rounded animate-pulse" />
        </div>
        <div className="space-y-1">
          <div className="w-16 h-2 bg-silver-100 rounded animate-pulse" />
          <div className="w-20 h-4 bg-silver-100 rounded animate-pulse" />
        </div>
        <div className="space-y-1 hidden sm:block">
          <div className="w-16 h-2 bg-silver-100 rounded animate-pulse" />
          <div className="w-24 h-4 bg-silver-100 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
