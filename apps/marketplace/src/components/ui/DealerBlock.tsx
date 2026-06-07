import { formatWebsiteHostname, sanitizeExternalUrl } from '../../lib/links.ts';
import { formatLocation } from '../../lib/display.ts';
import { sellerHref } from '../../lib/routes.ts';
import { useCategorySlug } from '../../contexts/CategoryContext.tsx';
import { ExternalLink } from './ExternalLink.tsx';
import { SectionCard } from './SectionCard.tsx';

type Props = {
  dealerId: string;
  dealerName: string;
  city: string | null;
  state: string | null;
  websiteUrl?: string | null;
  showInventoryLink?: boolean;
};

export function DealerBlock({
  dealerId,
  dealerName,
  city,
  state,
  websiteUrl,
  showInventoryLink = true,
}: Props) {
  const slug = useCategorySlug();
  const location = formatLocation(city, state);
  const safeWebsite = sanitizeExternalUrl(websiteUrl);

  return (
    <SectionCard>
      <p className="mp-label text-slate-400">Sold by</p>
      <a href={sellerHref(slug, dealerId)} className="mp-focus mt-1 block text-lg font-semibold text-slate-900 hover:text-blue-600">
        {dealerName}
      </a>
      {location && <p className="mt-1 text-sm text-slate-600">{location}</p>}

      {safeWebsite && (
        <p className="mt-3">
          <ExternalLink href={safeWebsite} className="text-sm font-semibold">
            Visit {formatWebsiteHostname(safeWebsite)}
          </ExternalLink>
        </p>
      )}

      {showInventoryLink && (
        <a
          href={sellerHref(slug, dealerId)}
          className="mp-focus mt-4 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          View all vehicles from this dealer →
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
}: Omit<Props, 'dealerId' | 'showInventoryLink'>) {
  const location = formatLocation(city, state);
  const safeWebsite = sanitizeExternalUrl(websiteUrl);

  return (
    <header className="mp-card mb-6 overflow-hidden sm:mb-8">
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-5 py-7 text-white sm:px-6 sm:py-8">
        <p className="mp-label text-slate-300">Dealer</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{dealerName}</h1>
        {location && <p className="mt-2 text-sm text-slate-200">{location}</p>}
      </div>

      {safeWebsite && (
        <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
          <ExternalLink href={safeWebsite} className="text-sm font-semibold">
            Visit {formatWebsiteHostname(safeWebsite)}
          </ExternalLink>
        </div>
      )}
    </header>
  );
}
