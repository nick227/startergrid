import { formatWebsiteHostname, sanitizeExternalUrl } from '../../lib/links.ts';
import { formatLocation } from '../../lib/display.ts';
import { sellerHref } from '../../lib/routes.ts';
import { useCategorySchema, useCategorySlug } from '../../contexts/CategoryContext.tsx';
import { ExternalLink } from './ExternalLink.tsx';
import { SectionCard } from './SectionCard.tsx';

type Props = {
  dealerId: string;
  dealerName: string;
  city: string | null;
  state: string | null;
  websiteUrl?: string | null;
  showInventoryLink?: boolean;
  fromListing?: string;
};

export function DealerBlock({
  dealerId,
  dealerName,
  city,
  state,
  websiteUrl,
  showInventoryLink = true,
  fromListing,
}: Props) {
  const slug = useCategorySlug();
  const schema = useCategorySchema();
  const location = formatLocation(city, state);
  const safeWebsite = sanitizeExternalUrl(websiteUrl);

  return (
    <SectionCard>
      <p className="mp-label text-slate-400">Sold by</p>
      <a href={sellerHref(slug, dealerId, fromListing)} className="mp-focus mt-1 block text-lg font-semibold text-slate-900 hover:text-blue-600">
        {dealerName}
      </a>
      {location && <p className="mt-1 text-sm text-slate-600">{location}</p>}

      {safeWebsite && (
        <p className="mt-3">
          <ExternalLink href={safeWebsite} className="break-all text-sm font-semibold">
            Visit {formatWebsiteHostname(safeWebsite)}
          </ExternalLink>
        </p>
      )}

      {showInventoryLink && (
        <a
          href={sellerHref(slug, dealerId, fromListing)}
          className="mp-focus mt-4 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          View all {schema.asset.plural} from this seller →
        </a>
      )}
    </SectionCard>
  );
}

export function DealerHero({
  dealerName,
  city,
  state,
  websiteUrl,
  inquireHref,
}: Omit<Props, 'dealerId' | 'showInventoryLink'> & { inquireHref?: string }) {
  const schema = useCategorySchema();
  const isAuto = schema.id === 'AUTOMOTIVE';
  const roleLabel = isAuto ? 'Dealer' : 'Seller';
  const location = formatLocation(city, state);
  const safeWebsite = sanitizeExternalUrl(websiteUrl);

  return (
    <header className="mp-card mb-6 overflow-hidden sm:mb-8">
      <div className="border-t-4 border-cta bg-surface-card px-5 py-7 sm:px-8 sm:py-9 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="min-w-0">
          <p className="mp-label text-cta">{roleLabel} storefront</p>
          <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight text-ink-heading sm:text-4xl">{dealerName}</h1>
          {location && <p className="mt-3 text-sm text-ink-muted">{location}</p>}
        </div>
        {inquireHref && (
          <div className="shrink-0">
            <a
              href={inquireHref}
              onClick={event => {
                if (!inquireHref.startsWith('#')) return;
                const target = document.getElementById(inquireHref.slice(1));
                if (!target) return;
                event.preventDefault();
                target.scrollIntoView({ block: 'start' });
                target.focus({ preventScroll: true });
              }}
              className="mp-btn-primary gap-2"
            >
              <span>Contact seller</span>
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        )}
      </div>

      {safeWebsite && (
        <div className="border-t border-silver-200 bg-surface-inset px-5 py-3 sm:px-8">
          <ExternalLink href={safeWebsite} className="break-all text-sm font-semibold">
            Visit {formatWebsiteHostname(safeWebsite)}
          </ExternalLink>
        </div>
      )}
    </header>
  );
}
