import { useState, useEffect } from 'react';
import { useMarketplaceFeed } from '../../hooks/useMarketplaceFeed.ts';
import { useCategorySlug, useCategoryTheme, useCategorySchema } from '../../contexts/CategoryContext.tsx';
import { listHref } from '../../lib/routes.ts';
import { formatPrice } from '../../lib/display.ts';

export function GenericPriceExplorer() {
  const slug = useCategorySlug();
  const schema = useCategorySchema();
  const { primaryColor } = useCategoryTheme();
  
  const isBooks = schema.id === 'EBOOKS';
  const isBoats = schema.id === 'BOATS';
  const minSlider = isBooks ? 1 : isBoats ? 5000 : 1000;
  const maxSlider = isBooks ? 50 : isBoats ? 150000 : 100000;
  const stepSlider = isBooks ? 1 : isBoats ? 2500 : 1000;
  const defaultPrice = isBooks ? 20 : isBoats ? 50000 : 35000;

  const [maxPrice, setMaxPrice] = useState(defaultPrice);

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
    <div className="bg-[#f4f7fa] py-10 sm:py-12">
      <div className="mp-rail">
        <div className="flex flex-col overflow-hidden rounded-2xl border border-silver-200 bg-white md:flex-row">
          {/* Left: Inputs */}
          <div className="p-8 md:w-1/2 border-b md:border-b-0 md:border-r border-silver-200">
            <h2 className="text-2xl font-extrabold text-navy-900 mb-2">Shop by Budget</h2>
            <p className="text-silver-500 mb-8 text-sm">Find {schema.asset.plural} that fit your budget.</p>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-bold text-navy-800">Max Budget</label>
                  <span className="text-sm font-bold" style={{ color: primaryColor }}>{formatPrice(maxPrice * 100)}</span>
                </div>
                <input 
                  type="range" 
                  min={minSlider} max={maxSlider} step={stepSlider} 
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
