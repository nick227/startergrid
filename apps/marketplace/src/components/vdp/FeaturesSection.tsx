import type { VehicleFeatures } from '@dealer-marketplace/client';
import { SectionCard } from '../ui/SectionCard.tsx';

type Props = { features: VehicleFeatures };

const CATEGORY_LABELS: Record<keyof VehicleFeatures['categories'], string> = {
  comfort: 'Comfort',
  technology: 'Technology',
  safety: 'Safety',
  exterior: 'Exterior',
  performance: 'Performance',
  utility: 'Utility',
  entertainment: 'Entertainment',
  other: 'Other',
};

export function FeaturesSection({ features }: Props) {
  const groups = (Object.entries(features.categories) as Array<[keyof VehicleFeatures['categories'], string[]]>)
    .filter(([, items]) => items.length > 0);

  if (features.highlights.length === 0 && groups.length === 0) return null;

  return (
    <SectionCard title="Features">
      {features.highlights.length > 0 && (
        <ul className="mb-4 flex flex-wrap gap-2">
          {features.highlights.map(item => (
            <li key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-4">
        {groups.map(([key, items]) => (
          <div key={key}>
            <h3 className="mp-label text-slate-400">{CATEGORY_LABELS[key]}</h3>
            <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
              {items.map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
