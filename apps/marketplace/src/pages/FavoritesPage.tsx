import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useQuery, queryErrorMessage } from '../hooks/useQuery.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { fetchFavorites, removeFavorite } from '../lib/api.ts';
import { listHref } from '../lib/routes.ts';
import { useCategoryId, useCategorySchema, useCategorySlug } from '../contexts/CategoryContext.tsx';
import { PageShell } from '../components/layout/PageShell.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { ListingCard } from '../components/ListingCard.tsx';
import { ListingGrid } from '../components/ui/ListingGrid.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { SkeletonGrid } from '../components/ui/SkeletonGrid.tsx';
import { getUnavailableFavoritesDescription } from '../features/availability/listingAvailability.ts';
import { QuickDetailDrawer } from '../components/listings/QuickDetailDrawer.tsx';

export default function FavoritesPage() {
  const { user, authReady, favoriteIds } = useAuth();
  const categoryId = useCategoryId();
  const slug = useCategorySlug();
  const schema = useCategorySchema();
  const [quickViewListingId, setQuickViewListingId] = useState<string | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  usePageMeta(`Saved ${schema.asset.plural}`, `Your saved ${schema.asset.plural} on the ${schema.label.toLowerCase()} marketplace.`);

  useEffect(() => {
    if (authReady && !user) {
      window.location.hash = listHref(slug).slice(1);
    }
  }, [authReady, user, slug]);

  const { data, loading, error, reload } = useQuery(
    () => fetchFavorites(categoryId),
    [user?.id, categoryId],
    { enabled: Boolean(user) },
  );

  const visibleCards         = data?.favorites.filter(v => favoriteIds.has(v.listingId)) ?? [];
  const unavailableFavorites = data?.unavailableFavorites ?? [];

  if (!authReady || !user) return null;

  const isEmpty = visibleCards.length === 0 && unavailableFavorites.length === 0;

  return (
    <PageShell>
      <PageHeader
        title={`Saved ${schema.asset.plural}`}
        subtitle={`${schema.asset.plural} you've saved on the ${schema.label.toLowerCase()} marketplace.`}
      />

      {loading && !data ? (
        <SkeletonGrid />
      ) : error ? (
        <ErrorState message={queryErrorMessage(error)} onRetry={reload} />
      ) : isEmpty ? (
        <EmptyState
          title={`No saved ${schema.asset.plural}`}
          description="Tap the heart icon on any listing to save it here."
          actionLabel={`Browse ${schema.asset.plural}`}
          onAction={() => { window.location.hash = listHref(slug).slice(1); }}
        />
      ) : (
        <>
          {visibleCards.length > 0 && (
            <ListingGrid>
              {visibleCards.map(card => (
                <ListingCard
                  key={card.listingId}
                  card={card}
                  onQuickView={(listingId) => {
                    setQuickViewListingId(listingId);
                    setQuickViewOpen(true);
                  }}
                />
              ))}
            </ListingGrid>
          )}

          {unavailableFavorites.length > 0 && (
            <section className="mt-10 border-t border-silver-200 pt-8" aria-labelledby="unavailable-favorites-heading">
              <h2 id="unavailable-favorites-heading" className="mp-section-title mb-4">
                No longer available
              </h2>
              <p className="mb-5 text-sm text-ink-muted">
                {getUnavailableFavoritesDescription(schema)}
              </p>
              <ul className="space-y-3">
                {unavailableFavorites.map(item => (
                  <li
                    key={item.listingId}
                    className="flex items-center justify-between gap-4 rounded-xl border border-silver-200 bg-white px-4 py-3 opacity-60"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink-body line-through">{item.title}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">No longer available</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFavorite(item.listingId).then(() => reload())}
                      className="mp-focus shrink-0 text-xs text-ink-faint underline-offset-2 hover:text-ink-muted hover:underline"
                    >
                      Dismiss
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      <QuickDetailDrawer
        open={quickViewOpen}
        listingId={quickViewListingId}
        onClose={() => setQuickViewOpen(false)}
      />
    </PageShell>
  );
}
