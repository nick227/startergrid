import { useState, useRef, useEffect } from 'react';
import { buildAutomotiveListHref } from './automotiveLinks.ts';
import { useMarketplaceFeed } from '../../hooks/useMarketplaceFeed.ts';
import { listingHref } from '../../lib/routes.ts';
import { useCategorySlug } from '../../contexts/CategoryContext.tsx';
import type { MarketplaceVehicleCard } from '../../lib/api.ts';

const TRENDING_SEARCHES = [
  'SUVs under $30k',
  'Used Trucks',
  'Electric Vehicles',
  'Honda Civic'
];

export function HomeHeroSearch() {
  const slug = useCategorySlug();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { vehicles, loading } = useMarketplaceFeed({ q: debouncedQuery, limit: 5 });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.hash = buildAutomotiveListHref({ q: query.trim() });
    }
    setIsDropdownOpen(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    window.location.hash = buildAutomotiveListHref({ q: suggestion });
    setIsDropdownOpen(false);
  };

  const handleVehicleClick = (vehicle: MarketplaceVehicleCard) => {
    const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    setQuery(title);
    window.location.hash = listingHref(slug, vehicle.listingId, title);
    setIsDropdownOpen(false);
  };

  return (
    <div className="bg-cta rounded-[2.5rem] px-6 py-12 sm:px-12 sm:py-20 flex flex-col items-center justify-center text-center">
      
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-white mb-8">
          Let's find your perfect car
        </h1>
        
        {/* Search Widget */}
        <div ref={dropdownRef} className="relative max-w-2xl mx-auto mb-6 z-50">
          <form onSubmit={handleSearch}>
            <div className={`flex items-center bg-surface-card shadow-elevation-2 p-2 focus-within:ring-2 focus-within:ring-orange-500 transition-all duration-200 ${isDropdownOpen ? 'rounded-t-[1.5rem] rounded-b-none border-b border-black/5 dark:border-white/5' : 'rounded-full'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Search make, model, or body style..." 
                className="flex-1 bg-transparent px-4 py-3 text-ink-heading placeholder:text-ink-muted outline-none text-lg"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
              />
              {query && (
                <button 
                  type="button" 
                  onClick={() => { setQuery(''); setIsDropdownOpen(true); }}
                  className="mr-2 text-ink-muted hover:text-ink-heading p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  aria-label="Clear search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
              <button 
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full transition whitespace-nowrap"
              >
                Search
              </button>
            </div>
          </form>

          {/* Autocomplete Dropdown */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 bg-surface-card rounded-b-[1.5rem] shadow-elevation-3 overflow-hidden text-left border-t-0 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4">
                {query.trim() === '' ? (
                  <div>
                    <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3 px-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      Trending Searches
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {TRENDING_SEARCHES.map(item => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleSuggestionClick(item)}
                          className="flex items-center px-4 py-2 bg-black/5 dark:bg-white/5 rounded-full text-sm text-ink-heading hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 border border-transparent hover:border-orange-200 dark:hover:border-orange-500/30 transition-colors"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-2"></div>
                        <p className="text-sm text-ink-muted">Searching inventory...</p>
                      </div>
                    ) : vehicles.length > 0 ? (
                      <ul className="space-y-1">
                        {vehicles.slice(0, 5).map((vehicle) => (
                          <li key={vehicle.listingId}>
                            <button
                              type="button"
                              onClick={() => handleVehicleClick(vehicle)}
                              className="w-full flex items-center px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors group"
                            >
                              <div className="w-16 h-12 bg-surface-inset rounded-lg overflow-hidden shrink-0 mr-4 border border-black/5 dark:border-white/5 shadow-sm group-hover:scale-105 transition-transform">
                                {vehicle.mediaUrls?.[0] ? (
                                  <img src={vehicle.mediaUrls[0]} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-ink-muted bg-surface-hover">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <span className="block text-ink-heading font-medium truncate">{vehicle.year} {vehicle.make} {vehicle.model}</span>
                                <span className="block text-xs text-ink-muted truncate">
                                  {vehicle.trim && `${vehicle.trim} • `}{vehicle.condition === 'NEW' ? 'New' : 'Used'}
                                </span>
                              </div>
                              <div className="text-right ml-4 shrink-0">
                                <span className="block text-sm font-semibold text-ink-heading">
                                  {vehicle.priceCents ? `$${(vehicle.priceCents / 100).toLocaleString()}` : 'Price pending'}
                                </span>
                                <span className="block text-xs text-ink-muted text-right">
                                  {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} ${vehicle.usageUnit?.toLowerCase() || 'mi'}` : '—'}
                                </span>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <p className="text-ink-heading font-medium">No inventory matches found</p>
                        <p className="text-sm text-ink-muted mt-1">Press search to see all matches for "{query}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {query.trim() !== '' && vehicles.length > 0 && (
                <div className="bg-black/5 dark:bg-white/5 px-6 py-3 border-t border-black/5 dark:border-white/5">
                  <button 
                    type="button"
                    onClick={() => handleSuggestionClick(query)}
                    className="text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 flex items-center justify-center w-full transition-colors"
                  >
                    See all results for "{query}"
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap justify-center gap-3">
          <span className="text-white font-medium text-sm mr-2 py-1">Browse by:</span>
          <a href={buildAutomotiveListHref({ condition: 'NEW' })} className="px-4 py-1 rounded-full border border-white/30 text-white hover:bg-white/10 transition text-sm font-medium">New</a>
          <a href={buildAutomotiveListHref({ condition: 'USED' })} className="px-4 py-1 rounded-full border border-white/30 text-white hover:bg-white/10 transition text-sm font-medium">Used</a>
          <a href={buildAutomotiveListHref({ powertrain: 'Electric' })} className="px-4 py-1 rounded-full border border-white/30 text-white hover:bg-white/10 transition text-sm font-medium">Electric</a>
          <a href={buildAutomotiveListHref({ powertrain: 'Hybrid' })} className="px-4 py-1 rounded-full border border-white/30 text-white hover:bg-white/10 transition text-sm font-medium">Hybrid</a>
        </div>
      </div>
      
    </div>
  );
}

