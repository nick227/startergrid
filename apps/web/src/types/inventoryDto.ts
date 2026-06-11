export type InventoryIdentitySummary = {
  id: string; // duplicate of the row ID for convenience, or the underlying primary DB ID
  primaryIdentifier: string; // e.g., VIN, SKU
  stockNumber: string;
  category: string; // e.g., AUTOMOTIVE
};

export type InventorySpecsSummary = {
  make: string;
  model: string;
  trim: string;
  year: number | null;
  mileage: number | null;
  exteriorColor: string;
  interiorColor: string;
  condition: string;
};

export type InventoryPricingSummary = {
  priceCents: number;
};

export type InventoryMediaSummary = {
  thumbnailUrl: string | null;
  photoCount: number;
  requiredShotsCoverage: string; // e.g., "5/8"
  missingRequiredShots: number;
};

export type InventoryReadinessSummary = {
  status: 'READY' | 'WARNING' | 'BLOCKED';
  nextAction: string | null;
  missingFields: string[];
};

export type InventoryDistributionSummary = {
  severity: number; // for sorting
  liveCount: number;
  queuedCount: number;
  failedCount: number;
  blockedCount: number;
  notLiveCount: number;
  totalPlatforms: number;
  nextAction: string | null;
  statusText: string; // e.g., "Live 5 · Queued 2"
};

export type InventoryPerformanceSummary = {
  daysOnline: number;
  messages: number;
  views: number;
  saves: number;
};

export type InventorySalesSummary = {
  isSold: boolean;
  soldDate: string | null;
  soldPlatform: string | null;
  soldPriceCents: number | null;
  daysToSale: number | null;
};

export type InventoryStatusSummary = {
  lifecycle: 'ACTIVE' | 'SOLD' | 'REMOVED';
  addedAt: string;
  lastUpdatedAt: string;
  lastSyncAt: string | null;
};

export type InventoryGridRowDto = {
  id: string; // The primary ID of the asset
  category: string;
  identity: InventoryIdentitySummary;
  specs: InventorySpecsSummary;
  pricing: InventoryPricingSummary;
  media: InventoryMediaSummary;
  readiness: InventoryReadinessSummary;
  publishing: InventoryDistributionSummary;
  performance: InventoryPerformanceSummary;
  sales: InventorySalesSummary;
  status: InventoryStatusSummary;
};

export type InventoryFieldDefinition = {
  key: string;
  label: string;
  group: string;
  sortable: boolean;
  tableDefault: boolean;
  cardDefault: boolean;
  optional: boolean;
  sortKey?: string;
  compactRenderer: string; // string identifier for standard cell renderers (e.g. 'thumb', 'text', 'currency', 'status')
};
