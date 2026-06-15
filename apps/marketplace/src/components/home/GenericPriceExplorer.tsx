import { useState, useEffect } from 'react';
import { useMarketplaceFeed } from '../../hooks/useMarketplaceFeed.ts';
import { useCategorySlug, useCategoryTheme } from '../../contexts/CategoryContext.tsx';
import { listHref } from '../../lib/routes.ts';

export function GenericPriceExplorer() {
  const slug = useCategorySlug();
  const { primaryColor } = useCategoryTheme();
  
  // A generic max price slider. Max defaults to something generic like $10,000
  const [maxPrice, setMaxPrice] = useState(10000);

  // Debounce the fetch so we don't spam the API while dragging sliders
  const [debouncedParams, setDebouncedParams] = useState({ maxPrice });
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedParams({ maxPrice });
    }, 300);
    return () => clearTimeout(t);
  }, [maxPrice]);

  // Request only 1 item to minimize payload, we just want `totalEstimate`
  const { data, loading } = useMarketplaceFeed({ 
    maxPrice: debouncedParams.maxPrice * 100, 
    limit: 1 
  });
  
  const matchingCount = data?.totalEstimate ?? 0;

  return (
    <div className="w-full mx-auto py-16 bg-navy-50">
      <div className="w-full">
        <div className="bg-white overflow-hidden flex flex-col md:flex-row">
          {/* Left: Inputs */}
          <div className="p-8 md:w-1/2 border-b md:border-b-0 md:border-r border-silver-200">
            <h2 className="text-2xl font-extrabold text-navy-900 mb-2">Shop by Budget</h2>
            <p className="text-silver-500 mb-8 text-sm">Find items that fit your budget.</p>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-bold text-navy-800">Max Budget</label>
                  <span className="text-sm font-bold" style={{ color: primaryColor }}>${maxPrice.toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min="50" max="100000" step="50" 
                  value={maxPrice} 
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full h-2 bg-silver-200 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: primaryColor }}
                />
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div className="p-8 md:w-1/2 bg-navy-900 text-white flex flex-col justify-center items-center text-center">
            <p className="text-sm font-bold text-silver-300 uppercase tracking-widest mb-2">Available Inventory</p>
            <div className="text-3xl sm:text-4xl font-extrabold text-white mb-6">
              {loading ? '...' : matchingCount.toLocaleString()} <span className="text-silver-400 font-normal text-xl">items</span>
            </div>
            
            <a 
              href={`${listHref(slug)}?maxPrice=${maxPrice * 100}`}
              className={`max-w-[240px] whitespace-nowrap mx-auto text-white font-bold py-4 px-8 rounded-full transition w-full ${loading ? 'opacity-70 pointer-events-none' : ''}`}
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? 'Calculating...' : `See matching items`}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
