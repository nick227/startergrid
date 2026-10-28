import { useState, useEffect, useMemo } from 'react';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { PageShell } from '../components/layout/PageShell.tsx';
import { listCategorySchemas, categoryIdToSlug, type BusinessCategoryId } from '@auto-dealer/category-schemas';
import { listingHref, sellerHref, listHref } from '../lib/routes.ts';
import {
  VERTICAL_GROUPS,
  CATEGORY_VERTICAL_META,
  type VerticalGroupId,
  type CategoryVerticalMeta,
} from '../data/productVerticals.ts';
import { CategoryIcon, DealerGridMark } from '../components/ui/CategoryIcons.tsx';
import { CategoryPreviewModal } from '../components/ui/CategoryPreviewModal.tsx';

type ApiSiteSummary = {
  category: string;
  slug: string;
  label: string;
  status: 'active' | 'coming_soon' | 'disabled';
  listingCount: number;
  href: string;
  tagline: string;
};

type ApiVehicleSummary = {
  listingId: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  condition: string;
  priceCents: number;
  mileage: number;
  exteriorColor: string;
  mediaUrls: string[];
  dealerId: string;
  dealerName: string;
  dealerCity: string;
  dealerState: string;
};

export default function SitesIndexPage() {
  usePageMeta(
    'DealerGrid Marketplace — Multi-Industry Product Discovery',
    'Browse products directly from connected dealerships, merchants, and direct sellers across automotive, marine, powersports, and specialty categories.',
  );

  const [apiSites, setApiSites] = useState<Record<string, ApiSiteSummary>>({});
  const [featuredVehicles, setFeaturedVehicles] = useState<ApiVehicleSummary[]>([]);
  const [selectedVertical, setSelectedVertical] = useState<'all' | VerticalGroupId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<'automotive' | 'boats' | 'trailers-powersports-rv'>('automotive');
  const [previewMeta, setPreviewMeta] = useState<CategoryVerticalMeta | null>(null);

  // Fetch live site metadata and counts from the API
  useEffect(() => {
    let cancelled = false;
    fetch('/api/marketplace/sites')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { sites?: ApiSiteSummary[] } | null) => {
        if (cancelled || !data?.sites) return;
        const map: Record<string, ApiSiteSummary> = {};
        for (const s of data.sites) {
          map[s.category] = s;
        }
        setApiSites(map);
      })
      .catch(() => {
        // Fallback to local schema defaults
      });

    // Fetch live inventory for the visual showcase
    fetch('/api/marketplace/vehicles?limit=6')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { vehicles?: ApiVehicleSummary[] } | null) => {
        if (cancelled || !data?.vehicles) return;
        setFeaturedVehicles(data.vehicles);
      })
      .catch(() => {
        // Non-fatal if vehicle fetch fails
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // All 18 registered categories mapped with vertical metadata
  const allCategories = useMemo(() => {
    const schemas = listCategorySchemas();
    return schemas.map((schema) => {
      const id = schema.id as BusinessCategoryId;
      const verticalMeta = CATEGORY_VERTICAL_META[id] || {
        id,
        slug: categoryIdToSlug(id),
        name: schema.label,
        verticalId: 'mobility' as VerticalGroupId,
        shortDesc: schema.marketplace.tagline,
        fullDesc: schema.marketplace.tagline,
        defaultStatus: 'pilot' as const,
        statusBadge: 'Coming Soon',
        primaryIdentifier: schema.asset.idLabel || 'Identifier',
        typicalItems: [schema.asset.plural],
        keyAttributes: ['Documented Item', 'Direct Seller'],
        syndicationPartners: ['DealerGrid Network'],
        gradient: 'from-slate-700 to-slate-900',
        accentColor: '#334155',
        iconKey: 'tag',
      };

      const siteApi = apiSites[id];
      const isLive = siteApi ? siteApi.status === 'active' && siteApi.listingCount > 0 : verticalMeta.defaultStatus === 'active';
      const listingCount = siteApi?.listingCount ?? (id === 'AUTOMOTIVE' ? 14 : id === 'BOATS' ? 5 : id === 'TRAILERS_POWERSPORTS_RV' ? 4 : 0);

      return {
        schema,
        verticalMeta,
        isLive,
        listingCount,
        siteApi,
      };
    });
  }, [apiSites]);

  // Separate into "Available Now" (live inventory) vs "Coming Soon" (in preparation)
  const availableNowCategories = useMemo(() => {
    return allCategories.filter((c) => c.isLive);
  }, [allCategories]);

  const comingSoonCategories = useMemo(() => {
    return allCategories.filter((c) => !c.isLive);
  }, [allCategories]);

  // Filtered list for the Coming Soon directory
  const filteredComingSoon = useMemo(() => {
    return comingSoonCategories.filter(({ verticalMeta }) => {
      if (selectedVertical !== 'all' && verticalMeta.verticalId !== selectedVertical) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = verticalMeta.name.toLowerCase().includes(query);
        const matchesDesc = verticalMeta.shortDesc.toLowerCase().includes(query);
        const matchesItems = verticalMeta.typicalItems.some((item) => item.toLowerCase().includes(query));
        return matchesName || matchesDesc || matchesItems;
      }
      return true;
    });
  }, [comingSoonCategories, selectedVertical, searchQuery]);

  // Parse natural language or structured search queries
  const parseSearchQuery = (rawInput: string) => {
    let clean = rawInput.trim();
    let maxPrice: number | undefined = undefined;

    // Check for "under $30k" or "under 30k" or "under $30,000" or "< $30k"
    const underKMatch = clean.match(/(?:under|<)\s*\$?([0-9]+(?:\.[0-9]+)?)\s*k\b/i);
    if (underKMatch) {
      const numK = parseFloat(underKMatch[1]!);
      if (!Number.isNaN(numK)) {
        maxPrice = Math.round(numK * 1000 * 100);
        clean = clean.replace(underKMatch[0], '').trim();
      }
    } else {
      const underNumMatch = clean.match(/(?:under|<)\s*\$?([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,})\b/i);
      if (underNumMatch) {
        const rawNum = underNumMatch[1]!.replace(/,/g, '');
        const num = parseFloat(rawNum);
        if (!Number.isNaN(num)) {
          maxPrice = Math.round(num * 100);
          clean = clean.replace(underNumMatch[0], '').trim();
        }
      }
    }

    clean = clean.replace(/\s+/g, ' ').trim();

    return {
      q: clean || undefined,
      maxPrice,
    };
  };

  // Handle hero search submission
  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const { q, maxPrice } = parseSearchQuery(searchQuery);
    const params: { q?: string; maxPrice?: number } = {};
    if (q) params.q = q;
    if (maxPrice != null) params.maxPrice = maxPrice;

    const targetUrl = listHref(searchCategory, params);
    window.location.hash = targetUrl.replace(/^#+/, '');
  };

  return (
    <PageShell showCategoryNav={false}>
      {/* ── 1. HERO & INSTANT SEARCH ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 text-white pt-14 pb-16 px-4 sm:px-6 lg:px-8 border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cta/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-emerald-400 border border-white/10 backdrop-blur-sm mb-6">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>MULTI-INDUSTRY DISCOVERY • CONNECTED SELLER NETWORK</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-5 leading-[1.1]">
            Find products from <br className="hidden sm:inline" />
            direct sellers.
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed mb-8">
            Browse real-time listings with transparent pricing, structured vehicle and vessel identifiers, and direct contact with selling dealerships and merchants.
          </p>

          {/* Interactive Search Box */}
          <form
            onSubmit={handleHeroSearch}
            className="max-w-3xl mx-auto bg-white rounded-2xl p-2 sm:p-2.5 shadow-2xl border border-silver-300 text-ink text-left"
          >
            <div className="flex flex-col sm:flex-row items-center gap-2">
              {/* Category Selector */}
              <div className="w-full sm:w-48 shrink-0">
                <label htmlFor="hero-category" className="sr-only">Category</label>
                <select
                  id="hero-category"
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value as typeof searchCategory)}
                  className="w-full py-3 px-3.5 text-xs sm:text-sm font-semibold rounded-xl bg-silver-100 text-navy-950 border-0 focus:ring-2 focus:ring-cta cursor-pointer"
                >
                  <option value="automotive">Vehicles (Cars, Trucks)</option>
                  <option value="boats">Boats &amp; Marine</option>
                  <option value="trailers-powersports-rv">Powersports &amp; RV</option>
                </select>
              </div>

              {/* Keyword Input */}
              <div className="relative flex-1 w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search make, model, or price (e.g. Honda, Silverado, under $30k)..."
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-cta border-0 bg-transparent text-navy-950 placeholder:text-slate-400 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-semibold text-slate-400 hover:text-navy-900"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Search Submit Button */}
              <button
                type="submit"
                className="w-full sm:w-auto shrink-0 mp-btn-primary py-3 px-6 text-sm font-bold shadow-md flex items-center justify-center gap-2"
              >
                <span>Search Inventory</span>
                <span className="text-xs">→</span>
              </button>
            </div>
          </form>

          {/* Quick-filter tags */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Popular:</span>
            <a
              href="#/automotive/list?maxPrice=3000000"
              className="rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 font-medium text-slate-200 transition"
              title="Vehicles under $30,000"
            >
              Under $30k
            </a>
            <a
              href="#/automotive/list?q=truck"
              className="rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 font-medium text-slate-200 transition"
            >
              Trucks
            </a>
            <a
              href="#/automotive/list?q=suv"
              className="rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 font-medium text-slate-200 transition"
            >
              SUVs
            </a>
            <a
              href="#/automotive/list?q=honda"
              className="rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 font-medium text-slate-200 transition"
            >
              Honda
            </a>
            <a
              href="#/automotive/list?q=bmw"
              className="rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 font-medium text-slate-200 transition"
            >
              BMW
            </a>
            <a
              href="#/boats/list"
              className="rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 font-medium text-slate-200 transition"
            >
              Boats
            </a>
            <a
              href="#/trailers-powersports-rv/list"
              className="rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 font-medium text-slate-200 transition"
            >
              Powersports &amp; RV
            </a>
          </div>
        </div>
      </section>

      {/* ── 2. ACTUAL INVENTORY SHOWCASE (Visual Priority) ───────────────────── */}
      <section className="py-14 bg-surface-page border-b border-silver-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live On Dealer Lots • Published Inventory
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight mt-1">
                Recently Published Inventory
              </h2>
              <p className="text-sm text-ink-muted mt-0.5">
                Explore actual vehicles with documented mileage, transparent window pricing, and direct dealership contacts.
              </p>
            </div>
            <a
              href={listHref('automotive')}
              className="mp-btn-primary text-xs py-2.5 px-4 shrink-0 font-bold flex items-center gap-1.5 shadow-sm"
            >
              <span>Explore All Automotive Lots ({apiSites.AUTOMOTIVE?.listingCount ?? 14})</span>
              <span>→</span>
            </a>
          </div>

          {/* Real Vehicle Inventory Cards */}
          {featuredVehicles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredVehicles.slice(0, 6).map((v) => {
                const title = `${v.year} ${v.make} ${v.model} ${v.trim || ''}`.trim();
                const priceFormatted = `$${(v.priceCents / 100).toLocaleString('en-US')}`;
                const mileageFormatted = `${v.mileage.toLocaleString('en-US')} miles`;
                const imgUrl = v.mediaUrls?.[0] || '/demo-assets/suv-white.svg';

                return (
                  <article
                    key={v.listingId}
                    className="group bg-white rounded-2xl border border-silver-200 overflow-hidden shadow-elevation-1 hover:shadow-elevation-2 hover:border-cta/40 transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Frame */}
                      <a
                        href={listingHref('automotive', v.listingId, title)}
                        className="relative aspect-[16/10] bg-silver-100 overflow-hidden flex items-center justify-center p-4 block"
                      >
                        <img
                          src={imgUrl}
                          alt={title}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300"
                          loading="lazy"
                        />
                        <div className="absolute top-3 left-3 rounded-full bg-navy-950/80 backdrop-blur-sm px-2.5 py-0.5 text-[11px] font-bold text-white uppercase tracking-wider">
                          {v.condition}
                        </div>
                        <div className="absolute bottom-3 right-3 rounded-lg bg-white/95 backdrop-blur-sm px-2.5 py-1 text-base font-extrabold text-navy-950 shadow-sm">
                          {priceFormatted}
                        </div>
                      </a>

                      {/* Listing Details */}
                      <div className="p-5 pb-3">
                        <a
                          href={listingHref('automotive', v.listingId, title)}
                          className="font-bold text-lg text-navy-950 group-hover:text-cta transition-colors line-clamp-1 block"
                        >
                          {title}
                        </a>
                        <div className="flex items-center gap-2 text-xs text-ink-muted mt-1.5 flex-wrap">
                          <span className="font-semibold text-slate-700">{mileageFormatted}</span>
                          <span>•</span>
                          <span>{v.exteriorColor}</span>
                          <span>•</span>
                          <span>Stock #{v.stockNumber}</span>
                        </div>
                      </div>
                    </div>

                    {/* Dealership & Action Footer */}
                    <div className="p-5 pt-3 border-t border-silver-100 bg-surface-page/50 flex flex-col gap-3">
                      <div className="flex items-center justify-between text-xs text-ink-muted">
                        <a
                          href={sellerHref('automotive', v.dealerId)}
                          className="font-semibold text-navy-900 hover:text-cta transition truncate max-w-[200px]"
                          title={`View ${v.dealerName}`}
                        >
                          {v.dealerName}
                        </a>
                        <span className="shrink-0">{v.dealerCity}, {v.dealerState}</span>
                      </div>

                      <a
                        href={listingHref('automotive', v.listingId, title)}
                        className="w-full mp-btn-secondary py-2 px-3 text-xs font-bold text-center flex items-center justify-center gap-1 hover:border-cta/40 transition"
                      >
                        <span>View Listing &amp; Contact Seller</span>
                        <span className="text-cta">→</span>
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-silver-200">
              <p className="text-sm text-ink-muted">Loading live inventory from connected dealerships...</p>
            </div>
          )}
        </div>
      </section>

      {/* ── 3. HOW BUYING WORKS (Shopper Journey) ────────────────────────────── */}
      <section className="py-14 bg-white border-b border-silver-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-navy-100 px-3 py-1 text-xs font-bold text-navy-900 mb-2">
              <span>HOW IT WORKS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
              A Direct Connection To Sellers
            </h2>
            <p className="text-sm text-ink-muted mt-1">
              Search real inventory, inspect structured details, and communicate directly with the lot.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-surface-page rounded-2xl p-5 border border-silver-200">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-cta font-bold text-base mb-4">
                1
              </div>
              <h3 className="font-bold text-base text-navy-950 mb-1.5">
                Search &amp; Filter
              </h3>
              <p className="text-xs text-ink-body leading-relaxed">
                Filter inventory by make, model, price, mileage, and category with live pricing and structured specifications.
              </p>
            </div>

            <div className="bg-surface-page rounded-2xl p-5 border border-silver-200">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold text-base mb-4">
                2
              </div>
              <h3 className="font-bold text-base text-navy-950 mb-1.5">
                Explore Inventory
              </h3>
              <p className="text-xs text-ink-body leading-relaxed">
                Every unit includes standard identifiers (VIN for cars, HIN for boats), photo galleries, and condition details.
              </p>
            </div>

            <div className="bg-surface-page rounded-2xl p-5 border border-silver-200">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 font-bold text-base mb-4">
                3
              </div>
              <h3 className="font-bold text-base text-navy-950 mb-1.5">
                View Storefront
              </h3>
              <p className="text-xs text-ink-body leading-relaxed">
                See exact dealership locations, showroom hours, inventory roster, and dealer profiles.
              </p>
            </div>

            <div className="bg-surface-page rounded-2xl p-5 border border-silver-200">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-700 font-bold text-base mb-4">
                4
              </div>
              <h3 className="font-bold text-base text-navy-950 mb-1.5">
                Contact Directly
              </h3>
              <p className="text-xs text-ink-body leading-relaxed">
                Send an inquiry straight to the selling sales desk without broker markups or resold contact information.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. AVAILABLE NOW — PUBLISHED INVENTORY CATEGORIES ───────────────── */}
      <section className="py-14 bg-surface-page border-b border-silver-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200 mb-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                AVAILABLE NOW • PUBLISHED INVENTORY
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
                Active Marketplace Categories
              </h2>
              <p className="text-sm text-ink-muted mt-1">
                These categories have active published listings ready for browsing and direct inquiry.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {availableNowCategories.map(({ schema, verticalMeta, listingCount }) => {
              return (
                <div
                  key={schema.id}
                  className="group bg-white rounded-2xl border border-silver-200 overflow-hidden shadow-elevation-1 hover:shadow-elevation-2 hover:border-cta/40 transition flex flex-col justify-between"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${verticalMeta.gradient} text-white shadow-md group-hover:scale-105 transition-transform duration-200`}
                      >
                        <CategoryIcon name={verticalMeta.iconKey} size={28} />
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {listingCount} Units Live
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-navy-950 group-hover:text-cta transition-colors mb-2">
                      {verticalMeta.name}
                    </h3>
                    <p className="text-xs text-ink-body leading-relaxed mb-4">
                      {verticalMeta.shortDesc}
                    </p>

                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Available Product Types
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {verticalMeta.typicalItems.map((item, idx) => (
                          <span
                            key={idx}
                            className="rounded bg-silver-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-silver-100 flex items-center justify-between text-xs text-ink-muted">
                      <span className="font-medium text-slate-600">Standard ID:</span>
                      <span className="font-semibold text-navy-900">{verticalMeta.primaryIdentifier.split(' ')[0]}</span>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <a
                      href={listHref(schema.marketplace.slug)}
                      className="w-full mp-btn-primary py-2.5 px-4 text-xs font-bold shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <span>Browse {schema.label} ({listingCount})</span>
                      <span>→</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. COMING SOON — SUPPORTED CATEGORIES IN PREPARATION ───────────── */}
      <section id="categories-grid" className="py-16 bg-white scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-silver-200 px-3 py-1 text-xs font-bold text-slate-700 mb-3">
              <span>EXPANDING ARCHITECTURE • COMING SOON</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight mb-2">
              Supported Industry Verticals In Preparation
            </h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              DealerGrid’s unified commerce platform is built to support 18 specialized product verticals with standardized identifiers and seller storefronts. The categories below are currently being prepared for public seller listings.
            </p>
          </div>

          {/* Industry Vertical Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <button
              type="button"
              onClick={() => setSelectedVertical('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedVertical === 'all'
                  ? 'bg-navy-950 text-white shadow-sm'
                  : 'bg-silver-100 text-ink-body hover:bg-silver-200'
              }`}
            >
              All Upcoming ({comingSoonCategories.length})
            </button>
            {VERTICAL_GROUPS.map((group) => {
              const count = comingSoonCategories.filter((c) => c.verticalMeta.verticalId === group.id).length;
              if (count === 0) return null;
              const active = selectedVertical === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedVertical(group.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    active
                      ? 'bg-navy-950 text-white shadow-sm'
                      : 'bg-silver-100 text-ink-body hover:bg-silver-200'
                  }`}
                >
                  <span>{group.shortLabel}</span>
                  <span className={`text-[10px] rounded-full px-1.5 py-0.2 ${active ? 'bg-white/20 text-white' : 'bg-silver-200 text-ink-muted'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Grid of Coming Soon Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredComingSoon.map(({ schema, verticalMeta }) => {
              return (
                <article
                  key={schema.id}
                  className="group bg-surface-page rounded-2xl border border-silver-200 overflow-hidden hover:border-cta/40 hover:bg-white transition flex flex-col justify-between"
                >
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${verticalMeta.gradient} text-white shadow-sm group-hover:scale-105 transition-transform duration-200`}
                      >
                        <CategoryIcon name={verticalMeta.iconKey} size={24} />
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-silver-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-silver-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        Coming Soon
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-navy-950 group-hover:text-cta transition-colors mb-1.5">
                      {verticalMeta.name}
                    </h3>
                    <p className="text-xs text-ink-body leading-relaxed mb-4 line-clamp-2">
                      {verticalMeta.shortDesc}
                    </p>

                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                        Supported Types
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {verticalMeta.typicalItems.slice(0, 3).map((item, idx) => (
                          <span
                            key={idx}
                            className="rounded bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-silver-200"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-silver-200/80 flex items-center justify-between text-xs text-ink-muted">
                      <span className="font-medium text-slate-600">Standard ID:</span>
                      <span className="font-semibold text-navy-900">{verticalMeta.primaryIdentifier.split(' ')[0]}</span>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <button
                      type="button"
                      onClick={() => setPreviewMeta(verticalMeta)}
                      className="w-full mp-btn-secondary py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 hover:border-cta/40 transition"
                    >
                      <span>View Category Specifications</span>
                      <span className="text-cta">↗</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 6. SELLER ONBOARDING CALLOUT (Shopper Secondary) ─────────────────── */}
      <section className="py-12 bg-surface-page border-b border-silver-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl bg-white border border-silver-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-cta mb-1">
                FOR DEALERSHIPS &amp; DIRECT MERCHANTS
              </div>
              <h3 className="text-xl font-bold text-navy-950">
                Are you a dealership or merchant?
              </h3>
              <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-xl">
                Connect your inventory feed, manage your storefront profile, and receive qualified buyer inquiries directly.
              </p>
            </div>
            <a
              href="http://localhost:5173/app/"
              target="_blank"
              rel="noreferrer"
              className="mp-btn-secondary py-2.5 px-5 text-xs font-bold shrink-0 hover:border-cta/40 transition flex items-center gap-1.5"
            >
              <span>Seller Portal</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── 7. EDITORIAL SITEMAP & FOOTER ────────────────────────────────────── */}
      <footer className="bg-navy-950 text-slate-400 py-14 px-4 sm:px-6 border-t border-white/10 text-xs">
        <div className="max-w-6xl mx-auto space-y-10">
          {/* Top Row: Brand & Links */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <DealerGridMark size={32} />
              <div>
                <div className="text-white font-extrabold text-sm tracking-tight">DEALERGRID MARKETPLACE</div>
                <div className="text-slate-500 text-[11px]">Multi-Industry Discovery &amp; Direct Seller Network</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-300">
              <a href="#/automotive/list" className="hover:text-white transition">Vehicles</a>
              <span className="text-slate-700">•</span>
              <a href="#/boats/list" className="hover:text-white transition">Boats</a>
              <span className="text-slate-700">•</span>
              <a href="#/trailers-powersports-rv/list" className="hover:text-white transition">Powersports</a>
              <span className="text-slate-700">•</span>
              <a href="http://localhost:5173/app/" className="hover:text-white transition">Seller Portal ↗</a>
              <span className="text-slate-700">•</span>
              <a href="http://localhost:3000/health" className="hover:text-white transition">API Health</a>
            </div>
          </div>

          {/* Directory Columns by Vertical */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-xs">
            {VERTICAL_GROUPS.map((group) => {
              const categories = allCategories.filter((c) => c.verticalMeta.verticalId === group.id);
              return (
                <div key={group.id} className="space-y-2.5">
                  <h4 className="font-bold uppercase tracking-wider text-white text-[11px]">
                    {group.shortLabel}
                  </h4>
                  <ul className="space-y-1.5">
                    {categories.map(({ schema, verticalMeta, isLive }) => (
                      <li key={schema.id}>
                        {isLive ? (
                          <a
                            href={listHref(schema.marketplace.slug)}
                            className="hover:text-white transition flex items-center gap-1.5 text-slate-300"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span className="truncate">{schema.label}</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPreviewMeta(verticalMeta)}
                            className="hover:text-white text-left transition flex items-center gap-1.5 text-slate-500"
                          >
                            <span className="h-1 w-1 rounded-full bg-slate-600 shrink-0" />
                            <span className="truncate">{schema.label}</span>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Bottom Compliance & Policy */}
          <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>
              © {new Date().getFullYear()} DealerGrid Inc. Inventory directly from connected sellers.
            </div>
            <div className="flex items-center gap-4">
              <span>Standardized Schemas (VIN, HIN, ISBN)</span>
              <span>•</span>
              <span>Direct Inquiries</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── 8. CATEGORY SPECIFICATION MODAL ──────────────────────────────────── */}
      <CategoryPreviewModal
        meta={previewMeta}
        onClose={() => setPreviewMeta(null)}
      />
    </PageShell>
  );
}
