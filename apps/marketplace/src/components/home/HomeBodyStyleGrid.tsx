import { useMarketplaceFacets } from '../../hooks/useMarketplaceFacets.ts';
import { buildAutomotiveListHref } from './automotiveLinks.ts';

// Hardcoded visual configuration (we only fetch counts dynamically)
const BODY_STYLE_CONFIG = [
  { label: 'SUV', icon: 'suv' },
  { label: 'Sedan', icon: 'sedan' },
  { label: 'Truck', icon: 'truck' },
  { label: 'Hatchback', icon: 'hatchback' },
  { label: 'Van', icon: 'van' },
  { label: 'Convertible', icon: 'convertible' },
];

export function HomeBodyStyleGrid() {
  const { data, loading } = useMarketplaceFacets({ category: 'AUTOMOTIVE' });

  // Map fetched counts
  const bodyStyleFacets = data?.customFacets?.bodyStyle || [];
  
  const getCountText = (label: string) => {
    if (loading) return 'Loading...';
    if (!data) return 'Browse'; // fallback text if error
    const facet = bodyStyleFacets.find(f => f.value.toLowerCase() === label.toLowerCase());
    if (!facet || facet.count === 0) return 'Browse';
    return `${facet.count.toLocaleString()} available`;
  };

  return (
    <div className="py-8">
      <div className="flex flex-wrap justify-center gap-4 sm:gap-8">
        {BODY_STYLE_CONFIG.map((style) => (
          <a 
            key={style.label} 
            href={buildAutomotiveListHref({ bodyStyle: style.label })}
            className="flex flex-col items-center group"
          >
            <div className="h-14 px-8 bg-silver-100 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 group-hover:bg-silver-200">
              {/* Mocking SVG icons with text for now */}
              <span className="text-xl font-bold text-navy-600">{style.icon.toUpperCase()}</span>
            </div>
            <span className="mt-3 text-sm font-semibold text-navy-900">{style.label}</span>
            <span className="text-xs text-silver-500">{getCountText(style.label)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
