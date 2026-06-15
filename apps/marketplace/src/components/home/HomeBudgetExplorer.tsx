import { useState, useEffect } from 'react';
import { useMarketplaceFeed } from '../../hooks/useMarketplaceFeed.ts';
import { buildAutomotiveListHref } from './automotiveLinks.ts';

export function HomeBudgetExplorer() {
  const [maxPrice, setMaxPrice] = useState(30000);
  const [minYear, setMinYear] = useState(2015);

  // Debounce the fetch so we don't spam the API while dragging sliders
  const [debouncedParams, setDebouncedParams] = useState({ maxPrice, minYear });
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedParams({ maxPrice, minYear });
    }, 300);
    return () => clearTimeout(t);
  }, [maxPrice, minYear]);

  // Request only 1 item to minimize payload, we just want `totalEstimate`
  const { data, loading } = useMarketplaceFeed({ 
    maxPrice: debouncedParams.maxPrice * 100, 
    minYear: debouncedParams.minYear,
    limit: 1 
  });
  
  const matchingCount = data?.totalEstimate ?? 0;

  return (
    <div className="w-full mx-auto py-16 bg-navy-50">
      <div className="w-full">
        <div className="bg-white overflow-hidden flex flex-col md:flex-row">
          {/* Left: Inputs */}
          <div className="p-8 md:w-1/2 border-b md:border-b-0 md:border-r border-silver-200">
            <h2 className="text-2xl font-extrabold text-navy-900 mb-2">Explore the market</h2>
            <p className="text-silver-500 mb-8 text-sm">Find cars that fit your budget and standards.</p>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-bold text-navy-800">Max Budget</label>
                  <span className="text-sm font-bold text-orange-600">${maxPrice.toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min="5000" max="100000" step="1000" 
                  value={maxPrice} 
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full h-2 bg-silver-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-bold text-navy-800">Year</label>
                  <span className="text-sm font-bold text-orange-600">{minYear} or newer</span>
                </div>
                <input 
                  type="range" 
                  min="2000" max={new Date().getFullYear()} step="1" 
                  value={minYear} 
                  onChange={(e) => setMinYear(Number(e.target.value))}
                  className="w-full h-2 bg-silver-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div className="p-8 md:w-1/2 bg-navy-900 text-white flex flex-col justify-center items-center text-center">
            <p className="text-sm font-bold text-silver-300 uppercase tracking-widest mb-2">Available Inventory</p>
            <div className="text-3xl sm:text-4xl font-extrabold text-white mb-6">
              {loading ? '...' : matchingCount.toLocaleString()} <span className="text-silver-400 font-normal text-xl">vehicles</span>
            </div>
            
            <a 
              href={buildAutomotiveListHref({ maxPrice: maxPrice * 100, minYear: minYear })}
              className={`max-w-[240px] whitespace-nowrap mx-auto bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-full transition w-full  shadow-orange-500/30 ${loading ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {loading ? 'Calculating...' : `See matching vehicles`}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
