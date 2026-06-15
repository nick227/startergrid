import { useState } from 'react';
import { MOCK_BUYING_GUIDES } from '../../data/homeMockData.ts';
import { ThumbnailCard } from './ThumbnailCard.tsx';

export function HomeBuyingGuides() {
  const featured = MOCK_BUYING_GUIDES.find(g => g.isFeatured);
  const allOthers = MOCK_BUYING_GUIDES.filter(g => !g.isFeatured);
  
  const [startIndex, setStartIndex] = useState(0);

  // We want to show 3 cards at a time. If we reach the end, we wrap around.
  const others = [
    allOthers[startIndex % allOthers.length],
    allOthers[(startIndex + 1) % allOthers.length],
    allOthers[(startIndex + 2) % allOthers.length],
  ].filter(Boolean); // safety check

  const handleNext = () => {
    setStartIndex(prev => (prev + 1) % allOthers.length);
  };

  return (
    <div className="py-16 bg-[#f8f6f0]"> {/* Subtle beige matching Edmunds */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Left Title Block */}
          <div className="lg:w-1/3 xl:w-1/4 flex flex-col pt-4">
            <div className="flex items-center gap-2 mb-2 text-cta font-bold tracking-tight">
              {/* Fake logo icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
                <path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zM12 10.5a.75.75 0 01.75.75v4.94l1.72-1.72a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 111.06-1.06l1.72 1.72v-4.94a.75.75 0 01.75-.75z" clipRule="evenodd" />
              </svg>
              <span>marketplace</span>
            </div>
            
            <h2 className="text-4xl sm:text-5xl font-extrabold text-navy-900 mb-6 leading-none">
              STYLISH<br/>VALUE
            </h2>
            
            <p className="text-ink-body text-lg mb-8 leading-relaxed">
              Explore our real-time feed searches to find the <span className="font-bold text-navy-900">best vehicles</span> and greatest deals on the market right now.
            </p>
            
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-navy-800 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-navy-800 shrink-0"></span>
                Pre-filtered live inventory
              </li>
              <li className="flex items-center gap-3 text-navy-800 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-navy-800 shrink-0"></span>
                Top-rated body styles
              </li>
              <li className="flex items-center gap-3 text-navy-800 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-navy-800 shrink-0"></span>
                Best local deals
              </li>
            </ul>
          </div>

          {/* Right Area (Grid) */}
          <div className="lg:w-2/3 xl:w-3/4 flex flex-col gap-6">
            
            {/* Top Row: Large Featured Card */}
            {featured && (
              <a href={featured.link} className="group relative rounded-2xl overflow-hidden shadow-elevation-1 hover:shadow-elevation-2 transition h-72 sm:h-96 bg-navy-900 w-full flex">
                <img 
                  src={featured.imageUrl} 
                  alt={featured.title} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-navy-900/90 via-navy-900/40 to-transparent" />
                <div className="relative z-10 p-8 sm:p-12 max-w-lg flex flex-col justify-center h-full text-white">
                  <h3 className="text-3xl font-bold mb-4 leading-tight">{featured.title}</h3>
                  <p className="text-silver-200 text-sm sm:text-base mb-8 leading-relaxed">
                    {featured.subtitle}
                  </p>
                  <span className="inline-block border border-white/40 hover:bg-white/10 px-6 py-2 rounded-full text-sm font-medium w-max transition">
                    View Collection
                  </span>
                </div>
              </a>
            )}

            {/* Bottom Row: 3 Smaller Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
              {others.map((guide, idx) => (
                <ThumbnailCard
                  key={`${guide.id}-${idx}`}
                  link={guide.link}
                  imageUrl={guide.imageUrl}
                  title={guide.title}
                  subtitle={guide.subtitle}
                />
              ))}
              
              {/* Arrow Control */}
              {allOthers.length > 3 && (
                <div className="absolute -right-5 top-20 -translate-y-1/2 hidden xl:flex">
                  <button 
                    onClick={handleNext}
                    className="bg-navy-950 shadow-chrome rounded-full p-2 text-white hover:bg-navy-800 transition hover:scale-110 active:scale-95" 
                    aria-label="Next guides"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
