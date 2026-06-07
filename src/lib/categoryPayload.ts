export type CategoryPayload = {
  usageUnit?: 'miles' | 'hours';
  unitType?: string;
};

export function parseCategoryPayload(raw: unknown): CategoryPayload {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const record = raw as Record<string, unknown>;
  const usageUnit = record['usageUnit'] === 'hours'
    ? 'hours'
    : record['usageUnit'] === 'miles'
      ? 'miles'
      : undefined;
  const unitType = typeof record['unitType'] === 'string' ? record['unitType'] : undefined;
  if (!usageUnit && !unitType) return {};
  return { usageUnit, unitType };
}

export function usageUnitFromPayload(raw: unknown): 'miles' | 'hours' | undefined {
  return parseCategoryPayload(raw).usageUnit;
}
