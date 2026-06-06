import type { ReactNode } from 'react';
import { listHref } from '../lib/routes.ts';

type Props = {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function Shell({ children, backHref, backLabel }: Props) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <a href={listHref()} className="font-bold text-blue-600 hover:text-blue-700 transition-colors">
            Vehicle Marketplace
          </a>
          {backHref && (
            <>
              <span className="text-slate-300">/</span>
              <a href={backHref} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                {backLabel ?? 'Back'}
              </a>
            </>
          )}
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

type LoadingProps = { label?: string };
export function LoadingSkeleton({ label = 'Loading…' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

type ErrorProps = { message: string; onRetry: () => void };
export function ErrorState({ message, onRetry }: ErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <p className="text-slate-500 text-sm">{message}</p>
      <button
        onClick={onRetry}
        className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

type EmptyProps = { label: string };
export function EmptyState({ label }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-2">
      <p className="text-4xl">🔍</p>
      <p className="text-sm">{label}</p>
    </div>
  );
}
