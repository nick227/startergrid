import { useState, useEffect } from 'react';
import { MOCK_EDITORIAL_CAMPAIGNS } from '../../data/homeMockData.ts';

export function HomeEditorialCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % MOCK_EDITORIAL_CAMPAIGNS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const activeCampaign = MOCK_EDITORIAL_CAMPAIGNS[activeIndex];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">

      {/* Hero Panel */}
      <div className="relative h-[400px] sm:h-[500px] w-full overflow-hidden shadow-elevation-2 group bg-navy-900">
        <img
          src={activeCampaign.imageUrl}
          alt={activeCampaign.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        
        {/* Specific dark gradient on the left, fading to clear on the right */}
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/95 via-navy-950/60 to-transparent" />

        {/* Content */}
        <div className="absolute inset-y-0 left-0 p-8 sm:p-16 flex flex-col justify-center max-w-xl">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-8 tracking-tight">
            {activeCampaign.title}
          </h2>
          
          <a
            href={activeCampaign.link}
            className="inline-flex items-center justify-center bg-white text-navy-900 font-bold py-3.5 px-8 rounded-full hover:bg-silver-100 transition shadow-lg w-max"
          >
            Explore Collection
          </a>
        </div>

        {/* Pagination Dots - Vertical on the far right */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3">
          {MOCK_EDITORIAL_CAMPAIGNS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`w-2.5 rounded-full transition-all duration-300 shadow-sm ${
                activeIndex === idx ? 'bg-white h-8' : 'bg-white/40 h-2.5 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
