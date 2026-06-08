import { useEffect } from 'react';
import { useCategoryId, useCategorySchema, useCategorySlug } from '../../contexts/CategoryContext.tsx';
import { useQuery, queryErrorMessage } from '../../hooks/useQuery.ts';
import { fetchVehicle, isNotFoundError } from '../../lib/api.ts';
import { formatLocation, formatPrice } from '../../lib/display.ts';
import { listingHref } from '../../lib/routes.ts';
import { getListingNotFoundDescription } from '../../features/availability/listingAvailability.ts';
import { buildListingShareUrl } from '../../features/listings/listingShare.ts';
import { ctasToPrimaryAction } from '../../features/listings/listingCtas.ts';
import { runListingPrimaryAction } from '../../features/listings/listingActions.ts';
import { FavoriteButton } from '../ui/FavoriteButton.tsx';
import { ErrorState } from '../ui/ErrorState.tsx';
import { SectionCard } from '../ui/SectionCard.tsx';
import { ConditionBadge } from '../ui/ConditionBadge.tsx';
import { MediaSection } from '../vdp/MediaSection.tsx';
import { AvailabilitySection } from '../vdp/AvailabilitySection.tsx';
import { FulfillmentSection } from '../vdp/FulfillmentSection.tsx';
import { ShareListingButton } from './ShareListingButton.tsx';

type Props = {
  open: boolean;
  listingId: string | null;
  onClose: () => void;
};

export function QuickDetailDrawer({ open, listingId, onClose }: Props) {
  const categoryId = useCategoryId();
  const slug = useCategorySlug();
  const schema = useCategorySchema();

  const enabled = open && Boolean(listingId);
  const { data, loading, error, reload } = useQuery(
    () => fetchVehicle(listingId!, categoryId),
    [listingId, categoryId],
    { enabled },
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const fullHref = listingId ? listingHref(slug, listingId) : '#';
  const inquiryHref = listingId ? `${listingHref(slug, listingId)}#inquiry` : undefined;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Quick view">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close quick view"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-surface-page-bright shadow-elevation-4">
        <header className="flex items-center justify-between gap-3 border-b border-silver-200 bg-white px-4 py-3">
          <a href={fullHref} className="mp-focus min-w-0 truncate text-sm font-semibold text-ink-heading hover:text-cta">
            View full details
          </a>
          <button type="button" className="mp-focus rounded-lg px-2 py-1 text-sm text-ink-muted hover:bg-silver-100" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && !data ? (
            <SectionCard title="Loading">
              <p className="text-sm text-ink-muted">Fetching listing details…</p>
            </SectionCard>
          ) : error ? (
            isNotFoundError(error) ? (
              <ErrorState
                title={`${schema.asset.titleLabel} not found`}
                message={getListingNotFoundDescription(schema)}
                onRetry={reload}
              />
            ) : (
              <ErrorState message={queryErrorMessage(error)} onRetry={reload} />
            )
          ) : data ? (
            <QuickDetailContent
              listingId={listingId!}
              fullHref={fullHref}
              inquiryHref={inquiryHref}
              onClose={onClose}
              detail={data.vehicle}
              ctas={data.ctas}
            />
          ) : (
            <ErrorState message="Could not load listing details." onRetry={reload} />
          )}
        </div>
      </div>
    </div>
  );
}

function QuickDetailContent({
  listingId,
  fullHref,
  inquiryHref,
  onClose,
  detail,
  ctas,
}: {
  listingId: string;
  fullHref: string;
  inquiryHref?: string;
  onClose: () => void;
  detail: Awaited<ReturnType<typeof fetchVehicle>>['vehicle'];
  ctas: Awaited<ReturnType<typeof fetchVehicle>>['ctas'];
}) {
  const slug = useCategorySlug();
  const schema = useCategorySchema();
  const location = formatLocation(detail.location.dealerCity, detail.location.dealerState);
  const shareUrl = buildListingShareUrl(slug, listingId);
  const primary = ctasToPrimaryAction(ctas, { inquiryHref });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <a href={fullHref} className="mp-focus text-lg font-bold leading-snug text-ink-heading hover:text-cta">
            {detail.core.title}
          </a>
          <ConditionBadge condition={detail.core.condition} className="shrink-0" />
        </div>
        {detail.core.trim && <p className="text-sm text-ink-muted">{detail.core.trim}</p>}
      </div>

      <MediaSection media={detail.media} alt={detail.core.title} />

      <SectionCard padded={false} className="p-4">
        <p className="mp-label text-ink-faint">Price</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-ink">{formatPrice(detail.commerce.priceCents)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <FavoriteButton listingId={detail.core.listingId} />
          <ShareListingButton title={detail.core.title} url={shareUrl} />
          <button
            type="button"
            className="mp-btn-primary ml-auto"
            onClick={() => { runListingPrimaryAction(primary); onClose(); }}
          >
            {primary.label}
          </button>
        </div>
      </SectionCard>

      <AvailabilitySection commerce={detail.commerce} />
      <FulfillmentSection />

      <SectionCard title="Seller">
        <p className="text-sm font-semibold text-ink-heading">{detail.location.dealerName}</p>
        {location && <p className="mt-1 text-sm text-ink-muted">{location}</p>}
        <a href={fullHref} className="mp-focus mt-3 inline-block text-sm font-semibold text-cta hover:underline">
          View full details →
        </a>
      </SectionCard>

      <p className="text-xs text-ink-faint">
        {schema.label} listings can change throughout the day. Contact the seller to confirm details.
      </p>
    </div>
  );
}

