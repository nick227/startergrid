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
    if (loading) return '';
    if (!data) return 'Browse'; // fallback text if error
    const facet = bodyStyleFacets.find(f => f.value.toLowerCase() === label.toLowerCase());
    if (!facet || facet.count === 0) return 'Browse';
    return `${facet.count.toLocaleString()} available`;
  };

  return (
    <div>
      <div className="flex flex-wrap justify-start gap-x-5 gap-y-4 sm:gap-x-8">
        {BODY_STYLE_CONFIG.map((style) => (
          <a 
            key={style.label} 
            href={buildAutomotiveListHref({ bodyStyle: style.label })}
            className="flex flex-col items-center group"
          >
            <div className="flex h-16 w-24 items-center justify-center rounded-2xl bg-[#e8eef3] transition group-hover:bg-[#dfe7ee]">
              <BodyStyleIcon name={style.icon} />
            </div>
            <span className="mt-3 text-sm font-semibold text-navy-900">{style.label}</span>
            <span className="text-xs text-silver-500">{getCountText(style.label)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function BodyStyleIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 72 36" className="h-8 w-16 text-navy-800" aria-hidden="true">
      {name === 'suv' && <path fill="currentColor" d="M8 20h4l3-8h22l5 5h16l4 3v6H8v-6zm8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm34 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />}
      {name === 'sedan' && <path fill="currentColor" d="M6 22h6l5-6h18l7 3h16l5 3v5H6v-5zm10 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm32 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />}
      {name === 'truck' && <path fill="currentColor" d="M4 14h26v12H4V14zm26 3h10l10 6v3H30v-9zm-16 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm32 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />}
      {name === 'hatchback' && <path fill="currentColor" d="M7 22h5l4-7h16l8 4 8 3v5H7v-5zm9 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm30 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />}
      {name === 'van' && <path fill="currentColor" d="M6 10h32l14 7v9H6V10zm8 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm34 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />}
      {name === 'convertible' && <path fill="currentColor" d="M6 23h7l6-4h22l4 2h15l5 2v4H6v-4zm10 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm32 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />}
    </svg>
  );
}
