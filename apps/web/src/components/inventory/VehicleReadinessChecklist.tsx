import type { VehicleReadinessDto } from '@/lib/api/sdk.ts';
import { InfoButton } from '@/components/docs/index.ts';

type Props = {
  readiness: VehicleReadinessDto;
};

const statusConfig = {
  READY:   { bg: 'bg-green-100 text-green-700 border-green-200',  label: 'Ready to send' },
  WARNING: { bg: 'bg-amber-100 text-amber-700 border-amber-200',  label: 'Needs details' },
  BLOCKED: { bg: 'bg-red-100 text-red-700 border-red-200',        label: 'Cannot list' },
};

function slotLabel(slot: string): string {
  return slot.replace(/[_-]/g, ' ').toLowerCase();
}

export function VehicleReadinessChecklist({ readiness }: Props) {
  const config = statusConfig[readiness.status];
  const recommendedOnly = readiness.missingRecommendedMediaSlots.filter(slot => !readiness.missingRequiredMediaSlots.includes(slot));
  const totalIssues = readiness.blockers.length + readiness.missingRequiredMediaSlots.length + readiness.warnings.length;
  const allClear = totalIssues === 0;

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center gap-2">
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${config.bg}`}>
          {config.label}
        </span>
        {allClear && recommendedOnly.length === 0 && <span className="text-xs text-green-600 font-medium">Photos and details are complete</span>}
        {allClear && recommendedOnly.length > 0 && <span className="text-xs text-ink-body font-medium">Required photos and details are in place</span>}
        {!allClear && <span className="text-[11px] text-ink-muted">{totalIssues} issue{totalIssues !== 1 ? 's' : ''}</span>}
        <InfoButton docId="inventory/warnings-vs-blocked" />
      </div>

      <ul className="space-y-1 grid grid-cols-3 w-full gap-2">
        {/* Missing required media */}
        {readiness.missingRequiredMediaSlots.map(s => (
          <li key={`ms${s}`} className="flex items-start gap-2 text-xs whitespace-nowrap">
            <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-bold">✕</span>
            <span className="text-red-700">Missing photo: <span className="font-medium">{slotLabel(s)}</span></span>
          </li>
        ))}
        {/* Invalid fields */}
        {readiness.invalidFields.map(f => (
          <li key={`if${f}`} className="flex items-start gap-2 text-xs whitespace-nowrap">
            <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-bold">✕</span>
            <span className="text-red-700"><span className="font-medium">{f}</span> format is invalid</span>
          </li>
        ))}
        {/* Warnings */}
        {readiness.warnings.map((w, i) => (
          <li key={`w${i}`} className="flex items-start gap-2 text-xs whitespace-nowrap">
            <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-bold">!</span>
            <span className="text-amber-700">{w}</span>
          </li>
        ))}
        {/* Recommended media hints */}
        {recommendedOnly.slice(0, 3).map(s => (
          <li key={`rec${s}`} className="flex items-start gap-2 text-xs whitespace-nowrap">
            <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-silver-100 text-ink-faint flex items-center justify-center text-[10px]">·</span>
            <span className="text-ink-muted">Consider adding: <span className="font-medium">{slotLabel(s)}</span></span>
          </li>
        ))}
        {recommendedOnly.length > 3 && (
          <li className="text-[11px] text-ink-faint pl-6">+{recommendedOnly.length - 3} more recommended shots</li>
        )}
        {/* All clear */}
        {allClear && (
          <li className="flex items-start gap-2 text-xs whitespace-nowrap">
            <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-bold">✓</span>
            <span className="text-green-700 font-medium">Required photos and details are in place. Next, choose where to send this vehicle.</span>
          </li>
        )}
      </ul>

    </div>
  );
}
