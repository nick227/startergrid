import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { operatorCopy } from '@/lib/copy/operator.ts';

export function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-xl bg-navy-800 mx-auto mb-4 animate-pulse" />
        <p className="text-ink-faint text-sm mb-6">{operatorCopy.auth.checkingSession}</p>
        <div className="bg-surface-card rounded-xl border border-silver-200 p-4">
          <Skeleton rows={3} />
        </div>
      </div>
    </div>
  );
}
