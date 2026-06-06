import { useEffect, useState } from 'react';
import { fetchMarketplaceVehicleDetail } from '@/lib/api/sdk.ts';
import type { MarketplaceVehicleCard } from '@/lib/types.ts';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';

type Props = {
  listingId: string;
  eligible: boolean;
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function MarketplacePreviewCard({ listingId, eligible }: Props) {
  const [card, setCard] = useState<MarketplaceVehicleCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eligible) {
      setCard(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMarketplaceVehicleDetail(listingId)
      .then(res => {
        if (!cancelled) setCard(res.vehicle);
      })
      .catch(e => {
        if (!cancelled) {
          setCard(null);
          setError(e instanceof Error ? e.message : 'Preview unavailable');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [listingId, eligible]);

  if (!eligible) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
        <p className="text-xs font-semibold text-slate-600">{EMPTY_STATE_COPY.marketplacePreviewUnavailable.title}</p>
        <p className="text-[10px] text-slate-500 mt-1">{EMPTY_STATE_COPY.marketplacePreviewUnavailable.subtitle}</p>
      </div>
    );
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 h-40 animate-pulse bg-slate-100" />;
  }

  if (error || !card) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold text-slate-600">Marketplace preview</p>
        <p className="text-[10px] text-slate-500 mt-1">{error ?? 'Not indexed yet — sync after price and photos are set.'}</p>
      </div>
    );
  }

  const hero = card.mediaUrls[0];

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Consumer preview</p>
        <span className="text-[10px] text-slate-400">No VIN · no operator data</span>
      </div>
      {hero ? (
        <div className="aspect-[16/10] bg-slate-100">
          <img src={hero} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-[16/10] bg-slate-100 flex items-center justify-center text-xs text-slate-400">
          No photos
        </div>
      )}
      <div className="p-3 space-y-1">
        <p className="text-sm font-bold text-slate-900 tabular-nums">{formatPrice(card.priceCents)}</p>
        <p className="text-xs text-slate-800">
          {card.year} {card.make} {card.model}
          {card.trim ? ` · ${card.trim}` : ''}
        </p>
        <p className="text-[10px] text-slate-500">
          {card.mileage.toLocaleString()} mi · {card.condition}
          {card.exteriorColor ? ` · ${card.exteriorColor}` : ''}
        </p>
        <p className="text-[10px] text-slate-400 pt-1">
          {card.dealerName}
          {card.dealerCity && card.dealerState ? ` · ${card.dealerCity}, ${card.dealerState}` : ''}
        </p>
      </div>
    </div>
  );
}
