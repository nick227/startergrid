import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { fetchMarketplaceVehicleDetail } from '@/lib/api/sdk.ts';
import {
  assessMarketplaceEligibility,
  buildMarketplacePreviewDisplay,
  type MarketplacePreviewDisplay,
} from '@/lib/marketplacePreview.ts';
import type { VehicleListItem } from '@/lib/types.ts';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';

type Props = {
  vehicle: Pick<VehicleListItem, 'id' | 'priceCents'>;
};

function PreviewShell({
  badge,
  title,
  children,
  tone = 'neutral',
}: {
  badge: string;
  title: string;
  children: ReactNode;
  tone?: 'neutral' | 'loading' | 'error' | 'ineligible';
}) {
  const toneBorder = {
    neutral: 'border-slate-200 bg-white',
    loading: 'border-sky-200 bg-sky-50/40',
    error: 'border-amber-200 bg-amber-50/50',
    ineligible: 'border-dashed border-amber-300 bg-amber-50/60',
  }[tone];

  return (
    <div className={`rounded-xl border overflow-hidden shadow-sm ${toneBorder}`}>
      <div className="px-3 py-2 border-b border-slate-100/80 bg-slate-50/90 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</p>
        <span className="text-[10px] font-semibold text-slate-400">{badge}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ConsumerCard({ display }: { display: MarketplacePreviewDisplay }) {
  const hero = display.mediaUrls[0];

  return (
    <>
      {hero ? (
        <div className="aspect-[16/10] -mx-4 -mt-4 mb-3 bg-slate-100">
          <img src={hero} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-[16/10] -mx-4 -mt-4 mb-3 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
          No photos in consumer card
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-bold text-slate-900 tabular-nums">{display.priceLabel}</p>
        <p className="text-xs text-slate-800">{display.titleLine}</p>
        <p className="text-[10px] text-slate-500">{display.specLine}</p>
        <p className="text-[10px] text-slate-400 pt-1">{display.dealerLine}</p>
      </div>
    </>
  );
}

export function MarketplacePreviewCard({ vehicle }: Props) {
  const eligibility = assessMarketplaceEligibility(vehicle);
  const [display, setDisplay] = useState<MarketplacePreviewDisplay | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => setAttempt(n => n + 1), []);

  useEffect(() => {
    if (!eligibility.eligible) {
      setDisplay(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDisplay(null);

    fetchMarketplaceVehicleDetail(vehicle.id)
      .then(res => {
        if (!cancelled) setDisplay(buildMarketplacePreviewDisplay(res.vehicle));
      })
      .catch(e => {
        if (!cancelled) {
          setDisplay(null);
          setError(e instanceof Error ? e.message : 'Preview unavailable');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [vehicle.id, eligibility.eligible, attempt]);

  if (!eligibility.eligible) {
    return (
      <PreviewShell badge="Operator only" title="Not marketplace eligible" tone="ineligible">
        <p className="text-xs font-semibold text-amber-900">
          {EMPTY_STATE_COPY.marketplacePreviewUnavailable.title}
        </p>
        <ul className="mt-2 space-y-1">
          {eligibility.operatorReasons.map(reason => (
            <li key={reason} className="text-[11px] text-amber-800 leading-snug">• {reason}</li>
          ))}
        </ul>
        <p className="text-[10px] text-amber-700/80 mt-3 border-t border-amber-200/80 pt-2">
          Consumer preview is hidden until eligibility rules pass. Readiness and movement data stay in the operator column only.
        </p>
      </PreviewShell>
    );
  }

  if (loading) {
    return (
      <PreviewShell badge="Loading" title="Consumer preview" tone="loading">
        <div className="space-y-3 animate-pulse">
          <div className="aspect-[16/10] bg-slate-200 rounded-lg" />
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-3 bg-slate-200 rounded w-2/3" />
          <div className="h-3 bg-slate-200 rounded w-1/2" />
        </div>
        <p className="text-[10px] text-sky-700 mt-3">Loading consumer preview from marketplace index…</p>
      </PreviewShell>
    );
  }

  if (error) {
    return (
      <PreviewShell badge="Error" title="Consumer preview" tone="error">
        <p className="text-xs font-semibold text-amber-900">Could not load marketplace preview</p>
        <p className="text-[11px] text-amber-800 mt-1 leading-snug">{error}</p>
        <p className="text-[10px] text-slate-500 mt-2">
          The vehicle may not be indexed yet. Run Sync after price and photos are set, then retry.
        </p>
        <button
          type="button"
          onClick={reload}
          className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
        >
          Retry preview
        </button>
      </PreviewShell>
    );
  }

  if (!display) {
    return (
      <PreviewShell badge="Empty" title="Consumer preview" tone="neutral">
        <p className="text-xs font-semibold text-slate-700">{EMPTY_STATE_COPY.marketplacePreviewEmpty.title}</p>
        <p className="text-[10px] text-slate-500 mt-1">{EMPTY_STATE_COPY.marketplacePreviewEmpty.subtitle}</p>
        <button
          type="button"
          onClick={reload}
          className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        >
          Retry preview
        </button>
      </PreviewShell>
    );
  }

  return (
    <PreviewShell badge="No VIN · no operator data" title="Consumer preview" tone="neutral">
      <ConsumerCard display={display} />
    </PreviewShell>
  );
}
