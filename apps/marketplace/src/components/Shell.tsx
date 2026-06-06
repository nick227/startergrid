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
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <a
            href={listHref()}
            className="text-base font-bold tracking-tight text-blue-600 transition hover:text-blue-700"
          >
            Vehicle Marketplace
          </a>
          {backHref && (
            <>
              <span className="text-slate-300" aria-hidden="true">/</span>
              <a
                href={backHref}
                className="truncate text-sm font-medium text-slate-500 transition hover:text-slate-800"
              >
                {backLabel ?? 'Back'}
              </a>
            </>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}

type PageHeroProps = {
  title: string;
  subtitle?: string;
};

export function PageHero({ title, subtitle }: PageHeroProps) {
  return (
    <header className="mb-8 space-y-2">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
      {subtitle && <p className="max-w-2xl text-base text-slate-600">{subtitle}</p>}
    </header>
  );
}

type LoadingProps = { label?: string };

export function LoadingSkeleton({ label = 'Loading…' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function VehicleGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="aspect-[4/3] animate-pulse bg-slate-200" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="h-6 w-1/3 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

type ErrorProps = { message: string; onRetry: () => void };

export function ErrorState({ message, onRetry }: ErrorProps) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-12 text-center">
      <p className="text-sm font-medium text-red-800">Something went wrong</p>
      <p className="mt-2 text-sm text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}

type EmptyProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <p className="text-lg font-semibold text-slate-800">{title}</p>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
