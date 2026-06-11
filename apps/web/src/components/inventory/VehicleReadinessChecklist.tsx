import type { VehicleReadinessDto } from '@/lib/api/sdk.ts';

type Props = {
  readiness: VehicleReadinessDto;
};

const statusConfig = {
  READY:   { bg: 'bg-green-100 text-green-700 border-green-200',  label: 'READY'   },
  WARNING: { bg: 'bg-amber-100 text-amber-700 border-amber-200',  label: 'WARNING' },
  BLOCKED: { bg: 'bg-red-100 text-red-700 border-red-200',        label: 'BLOCKED' },
};

export function VehicleReadinessChecklist({ readiness }: Props) {
  const config = statusConfig[readiness.status];
  const totalIssues = readiness.blockers.length + readiness.missingRequiredMediaSlots.length + readiness.warnings.length;
  const allClear = totalIssues === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${config.bg}`}>
          {config.label}
        </span>
        {allClear && <span className="text-xs text-green-600 font-medium">All checks pass — ready to publish</span>}
        {!allClear && <span className="text-[11px] text-ink-muted">{totalIssues} issue{totalIssues !== 1 ? 's' : ''}</span>}
      </div>

      <ul className="space-y-1">
        {/* Blockers */}
        {readiness.blockers.map((b, i) => (
          <li key={`b${i}`} className="flex items-start gap-2 text-xs">
            <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-bold">✕</span>
            <span className="text-red-700 font-medium">{b}</span>
          </li>
        ))}
        {/* Missing required media */}
        {readiness.missingRequiredMediaSlots.map(s => (
          <li key={`ms${s}`} className="flex items-start gap-2 text-xs">
            <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-bold">✕</span>
            <span className="text-red-700">Missing photo: <span className="font-medium">{s}</span></span>
          </li>
        ))}
        {/* Invalid fields */}
        {readiness.invalidFields.map(f => (
          <li key={`if${f}`} className="flex items-start gap-2 text-xs">
            <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-bold">✕</span>
            <span className="text-red-700"><span className="font-medium">{f}</span> format is invalid</span>
          </li>
        ))}
        {/* Warnings */}
        {readiness.warnings.map((w, i) => (
          <li key={`w${i}`} className="flex items-start gap-2 text-xs">
            <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-bold">!</span>
            <span className="text-amber-700">{w}</span>
          </li>
        ))}
        {/* Recommended media hints */}
        {readiness.missingRecommendedMediaSlots.slice(0, 3).map(s => (
          <li key={`rec${s}`} className="flex items-start gap-2 text-xs">
            <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-silver-100 text-ink-faint flex items-center justify-center text-[10px]">·</span>
            <span className="text-ink-muted">Consider adding: <span className="font-medium">{s}</span></span>
          </li>
        ))}
        {readiness.missingRecommendedMediaSlots.length > 3 && (
          <li className="text-[11px] text-ink-faint pl-6">+{readiness.missingRecommendedMediaSlots.length - 3} more recommended shots</li>
        )}
        {/* All clear */}
        {allClear && (
          <li className="flex items-start gap-2 text-xs">
            <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-bold">✓</span>
            <span className="text-green-700 font-medium">All required fields and media complete</span>
          </li>
        )}
      </ul>

      {readiness.nextAction && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <span className="font-semibold">Next action: </span>{readiness.nextAction}
        </div>
      )}
    </div>
  );
}
