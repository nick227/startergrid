import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useQuery, queryErrorMessage } from '../hooks/useQuery.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { fetchFavorites } from '../lib/api.ts';
import { listHref } from '../lib/routes.ts';
import { useCategoryId, useCategorySchema, useCategorySlug } from '../contexts/CategoryContext.tsx';
import { PageShell } from '../components/layout/PageShell.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { VehicleCard } from '../components/VehicleCard.tsx';
import { VehicleGrid } from '../components/ui/VehicleGrid.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { SkeletonGrid } from '../components/ui/SkeletonGrid.tsx';

export default function FavoritesPage() {
  const { user, authReady, favoriteIds } = useAuth();
  const categoryId = useCategoryId();
  const slug = useCategorySlug();
  const schema = useCategorySchema();

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

  const visibleCards = data?.favorites.filter(v => favoriteIds.has(v.listingId)) ?? [];

  if (!authReady || !user) return null;

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
      ) : visibleCards.length === 0 ? (
        <EmptyState
          title={`No saved ${schema.asset.plural}`}
          description="Tap the heart icon on any listing to save it here."
          actionLabel={`Browse ${schema.asset.plural}`}
          onAction={() => { window.location.hash = listHref(slug).slice(1); }}
        />
      ) : (
        <VehicleGrid>
          {visibleCards.map(card => (
            <VehicleCard key={card.listingId} card={card} />
          ))}
        </VehicleGrid>
      )}
    </PageShell>
  );
}
