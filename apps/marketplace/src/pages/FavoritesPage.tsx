import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useQuery, queryErrorMessage } from '../hooks/useQuery.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { fetchFavorites } from '../lib/api.ts';
import { PageShell } from '../components/layout/PageShell.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { VehicleCard } from '../components/VehicleCard.tsx';
import { VehicleGrid } from '../components/ui/VehicleGrid.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { SkeletonGrid } from '../components/ui/SkeletonGrid.tsx';

export default function FavoritesPage() {
  const { user, authReady, favoriteIds } = useAuth();

  usePageMeta('Saved vehicles', 'Your saved vehicle listings.');

  useEffect(() => {
    if (authReady && !user) {
      window.location.hash = '#/';
    }
  }, [authReady, user]);

  const { data, loading, error, reload } = useQuery(
    () => fetchFavorites(),
    [user?.id],
  );

  // Filter out any cards the user unfavorited since the page loaded
  const visibleCards = data?.favorites.filter(v => favoriteIds.has(v.listingId)) ?? [];

  if (!authReady || !user) return null;

  return (
    <PageShell>
      <PageHeader
        title="Saved vehicles"
        subtitle="Vehicles you've saved. Sold or unavailable listings are automatically removed."
      />

      {loading && !data ? (
        <SkeletonGrid />
      ) : error ? (
        <ErrorState message={queryErrorMessage(error)} onRetry={reload} />
      ) : visibleCards.length === 0 ? (
        <EmptyState
          title="No saved vehicles"
          description="Tap the heart icon on any listing to save it here."
          actionLabel="Browse vehicles"
          onAction={() => { window.location.hash = '#/'; }}
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
