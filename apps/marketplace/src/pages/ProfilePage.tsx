import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useCategoryId, useCategorySchema, useCategorySlug } from '../contexts/CategoryContext.tsx';
import { PageShell } from '../components/layout/PageShell.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { SkeletonBlock } from '../components/ui/SkeletonBlock.tsx';
import { ListingImage } from '../components/ui/ListingImage.tsx';
import { FetchError, fetchFavorites } from '../lib/api.ts';
import { formatPrice, vehicleHeading } from '../lib/display.ts';
import { favoritesHref, listingHref, listHref } from '../lib/routes.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { useQuery, queryErrorMessage } from '../hooks/useQuery.ts';
import {
  readRecentListings,
  subscribeRecentListings,
  type RecentListing,
} from '../features/listings/recentlyViewed.ts';
import {
  getServerSnapshot as getSavedSearchesServerSnapshot,
  getSnapshot as getSavedSearchesSnapshot,
  removeSavedSearch,
  subscribeSavedSearches,
  type SavedSearch,
} from '../features/listings/savedSearches.ts';
import { toListQuery } from '../features/listings/listingQuery.ts';

function subscribeRecent(onStoreChange: () => void) {
  const unsubscribe = subscribeRecentListings(onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    unsubscribe();
    window.removeEventListener('storage', onStoreChange);
  };
}

const EMPTY_RECENT: RecentListing[] = [];

export default function ProfilePage() {
  const { user, authReady, updateProfile } = useAuth();
  const categoryId = useCategoryId();
  const slug = useCategorySlug();
  const schema = useCategorySchema();
  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  usePageMeta('Your profile', `Manage your ${schema.label.toLowerCase()} marketplace account and saved activity.`);

  useEffect(() => {
    if (authReady && !user) {
      window.location.hash = listHref(slug).slice(1);
    }
  }, [authReady, user, slug]);

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
  }, [user?.displayName]);

  const { data, loading, error, reload } = useQuery(
    () => fetchFavorites(categoryId),
    [user?.id, categoryId],
    { enabled: Boolean(user) },
  );

  const allRecent = useSyncExternalStore(subscribeRecent, readRecentListings, () => EMPTY_RECENT);
  const allSavedSearches = useSyncExternalStore(
    subscribeSavedSearches,
    getSavedSearchesSnapshot,
    getSavedSearchesServerSnapshot,
  );

  const recent = useMemo(
    () => allRecent.filter(item => item.categorySlug === slug).slice(0, 4),
    [allRecent, slug],
  );
  const savedSearches = useMemo(
    () => allSavedSearches.filter((entry: SavedSearch) => entry.categorySlug === slug).slice(0, 5),
    [allSavedSearches, slug],
  );
  const favorites = data?.favorites.slice(0, 4) ?? [];
  const unavailableCount = data?.unavailableFavorites.length ?? 0;

  if (!authReady || !user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setFormError(null);

    if (newPassword && newPassword.length < 8) {
      setFormError('New password must be at least 8 characters.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim() || null,
        ...(newPassword ? { currentPassword, newPassword } : {}),
      });
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Profile updated.');
    } catch (err) {
      if (err instanceof FetchError && err.status === 401) {
        setFormError('Current password is incorrect.');
      } else {
        setFormError('Could not update your profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Your profile"
        subtitle={`Manage your account and saved activity for the ${schema.label.toLowerCase()} marketplace.`}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="mp-card p-5" aria-labelledby="account-settings-heading">
          <h2 id="account-settings-heading" className="text-base font-semibold text-ink-heading">
            Account settings
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{user.email}</p>

          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
            {formError && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}
            {message && (
              <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {message}
              </p>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="mp-label">Username</span>
              <input
                type="text"
                autoComplete="nickname"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="mp-input"
                maxLength={160}
                disabled={saving}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="mp-label">Current password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="mp-input"
                  disabled={saving}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="mp-label">New password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="mp-input"
                  disabled={saving}
                />
              </label>
            </div>

            <button
              type="submit"
              className="mp-btn-primary"
              disabled={saving || (Boolean(newPassword) && !currentPassword)}
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </section>

        <aside className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1" aria-label="Profile summary">
          <SummaryStat label="Saved listings" value={data?.total ?? 0} href={favoritesHref(slug)} />
          <SummaryStat label="Recently viewed" value={recent.length} href="#recently-viewed-profile" />
          <SummaryStat label="Saved searches" value={savedSearches.length} href="#saved-searches-profile" />
        </aside>
      </div>

      <section className="mt-8" aria-labelledby="favorites-profile-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="favorites-profile-heading" className="mp-section-title">Saved listings</h2>
            {unavailableCount > 0 && (
              <p className="mt-1 text-sm text-ink-muted">{unavailableCount} saved item{unavailableCount === 1 ? '' : 's'} no longer available.</p>
            )}
          </div>
          <a href={favoritesHref(slug)} className="mp-btn-secondary py-2 text-sm">View all</a>
        </div>

        {loading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map(i => <SkeletonBlock key={i} className="h-40" />)}
          </div>
        ) : error ? (
          <ErrorState message={queryErrorMessage(error)} onRetry={reload} />
        ) : favorites.length === 0 ? (
          <ProfileEmpty text={`Saved ${schema.asset.plural.toLowerCase()} will appear here.`} href={listHref(slug)} label={`Browse ${schema.asset.plural}`} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {favorites.map(card => (
              <ListingSummaryCard
                key={card.listingId}
                href={listingHref(slug, card.listingId, vehicleHeading(card))}
                title={vehicleHeading(card)}
                imageUrl={card.mediaUrls[0] ?? null}
                priceCents={card.priceCents}
                detail={card.dealerName}
              />
            ))}
          </div>
        )}
      </section>

      <section id="recently-viewed-profile" className="mt-8" aria-labelledby="recently-viewed-profile-heading">
        <h2 id="recently-viewed-profile-heading" className="mp-section-title mb-4">Recently viewed</h2>
        {recent.length === 0 ? (
          <ProfileEmpty text="Listings you open will be tracked here on this device." href={listHref(slug)} label="Start browsing" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map(item => (
              <ListingSummaryCard
                key={item.listingId}
                href={listingHref(item.categorySlug, item.listingId, item.title)}
                title={item.title}
                imageUrl={item.imageUrl}
                priceCents={item.priceCents}
                detail={item.sellerName}
              />
            ))}
          </div>
        )}
      </section>

      <section id="saved-searches-profile" className="mt-8" aria-labelledby="saved-searches-profile-heading">
        <h2 id="saved-searches-profile-heading" className="mp-section-title mb-4">Saved searches</h2>
        {savedSearches.length === 0 ? (
          <ProfileEmpty text="Filter combinations you save will appear here." href={listHref(slug)} label="Search listings" />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {savedSearches.map(entry => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-silver-200 bg-white px-4 py-3">
                <a href={listHref(entry.categorySlug, toListQuery(entry.query))} className="mp-focus min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-heading">{entry.label}</span>
                  <span className="mt-0.5 block text-xs text-ink-faint">
                    Saved {new Date(entry.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </a>
                <button type="button" className="mp-btn-ghost px-2 py-1 text-sm" onClick={() => removeSavedSearch(entry.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}

function SummaryStat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <a href={href} className="mp-card mp-focus block p-4 transition hover:border-navy-500/40 hover:shadow-elevation-2">
      <span className="block text-2xl font-bold tabular-nums text-ink-heading">{value}</span>
      <span className="mt-1 block text-sm font-medium text-ink-muted">{label}</span>
    </a>
  );
}

function ProfileEmpty({ text, href, label }: { text: string; href: string; label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-silver-300 bg-white px-4 py-6 text-center">
      <p className="text-sm text-ink-muted">{text}</p>
      <a href={href} className="mp-btn-secondary mt-4 py-2 text-sm">{label}</a>
    </div>
  );
}

function ListingSummaryCard({
  href,
  title,
  imageUrl,
  priceCents,
  detail,
}: {
  href: string;
  title: string;
  imageUrl: string | null;
  priceCents: number;
  detail: string;
}) {
  return (
    <a href={href} className="mp-card mp-focus block transition hover:border-navy-500/40 hover:shadow-elevation-2">
      <div className="aspect-[4/3] bg-surface-inset">
        <ListingImage src={imageUrl ?? undefined} alt={title} imgClassName="h-full w-full object-cover" />
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-ink-heading">{title}</p>
        <p className="mt-1 text-sm font-bold tabular-nums text-ink">{formatPrice(priceCents)}</p>
        <p className="mt-1 truncate text-xs text-ink-muted">{detail}</p>
      </div>
    </a>
  );
}
