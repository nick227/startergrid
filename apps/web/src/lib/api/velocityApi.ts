export type VelocityMilestone = 'FRESH' | 'REVIEW' | 'AGING' | 'CRITICAL';
export type VelocityRecommendationAction =
  | 'MONITOR'
  | 'ADD_PHOTOS'
  | 'MONITOR_ENGAGEMENT'
  | 'RECENTLY_ADJUSTED'
  | 'SUGGEST_PRICE_ADJUSTMENT'
  | 'CRITICAL_PRICE_ADJUSTMENT';

export interface VelocityVehicleItem {
  id: string;
  stockNumber: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number;
  priceCents: number;
  originalPriceCents: number | null;
  createdAt: string;
  priceLastChangedAt: string | null;
  daysOnLot: number;
  daysSincePriceChange: number;
  milestone: VelocityMilestone;
  milestoneLabel: string;
  milestoneTone: 'emerald' | 'blue' | 'amber' | 'rose';
  photoCount: number;
  suggestedPriceCents: number | null;
  suggestedMarkdownCents: number | null;
  suggestedMarkdownPercent: number | null;
  recommendationAction: VelocityRecommendationAction;
  recommendationReason: string;
}

export interface InventoryVelocitySummary {
  dealershipId: string;
  totalInStock: number;
  freshCount: number;
  reviewCount: number;
  agingCount: number;
  criticalCount: number;
  averageDaysOnLot: number;
  totalCapitalAtRiskCents: number;
  totalInventoryValueCents: number;
  actionableRepriceCount: number;
  generatedAt: string;
}

export interface InventoryVelocityResponse {
  summary: InventoryVelocitySummary;
  vehicles: VelocityVehicleItem[];
}

export interface RepriceResult {
  success: boolean;
  vehicleId: string;
  stockNumber: string;
  oldPriceCents: number;
  newPriceCents: number;
  priceDeltaCents: number;
}

export async function fetchInventoryVelocity(
  dealerId: string,
): Promise<InventoryVelocityResponse> {
  const res = await fetch(`/api/dealers/${encodeURIComponent(dealerId)}/inventory/velocity`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch inventory velocity report');
  }
  return res.json();
}

export async function applyVelocityReprice(
  dealerId: string,
  vehicleId: string,
  newPriceCents: number,
  reason?: string,
): Promise<RepriceResult> {
  const res = await fetch(`/api/dealers/${encodeURIComponent(dealerId)}/inventory/velocity/reprice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ vehicleId, newPriceCents, reason }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to apply velocity repricing');
  }
  return res.json();
}
