export type CategoryPayload = {
  usageUnit?: 'miles' | 'hours';
  unitType?: string;
  vesselType?: string;
  lengthFt?: number;
  engineHours?: number;
};

function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function parseCategoryPayload(raw: unknown): CategoryPayload {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const record = raw as Record<string, unknown>;
  const usageUnit = record['usageUnit'] === 'hours'
    ? 'hours'
    : record['usageUnit'] === 'miles'
      ? 'miles'
      : undefined;
  const unitType = typeof record['unitType'] === 'string' ? record['unitType'] : undefined;
  const vesselType = typeof record['vesselType'] === 'string' ? record['vesselType'] : undefined;
  const lengthFt = asOptionalNumber(record['lengthFt']);
  const engineHours = asOptionalNumber(record['engineHours']);
  if (!usageUnit && !unitType && !vesselType && lengthFt == null && engineHours == null) return {};
  return { usageUnit, unitType, vesselType, lengthFt, engineHours };
}

export function usageUnitFromPayload(raw: unknown): 'miles' | 'hours' | undefined {
  return parseCategoryPayload(raw).usageUnit;
}
