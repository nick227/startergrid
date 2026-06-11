import { InventoryFieldDefinition } from '../../types/inventoryDto.ts';

export const INVENTORY_FIELD_REGISTRY: Record<string, InventoryFieldDefinition> = {
  // Identity
  thumb: { key: 'thumb', label: 'Image', group: 'Media', sortable: false, tableDefault: true, cardDefault: true, optional: false, compactRenderer: 'thumb' },
  vin: { key: 'vin', label: 'VIN', group: 'Identity', sortable: true, tableDefault: false, cardDefault: false, optional: true, compactRenderer: 'text' },
  stockNumber: { key: 'stockNumber', label: 'Stock #', group: 'Identity', sortable: true, tableDefault: false, cardDefault: false, optional: true, compactRenderer: 'text' },

  // Vehicle Specs
  make: { key: 'make', label: 'Make', group: 'Vehicle Specs', sortable: true, tableDefault: true, cardDefault: true, optional: false, sortKey: 'specs.make', compactRenderer: 'text' },
  model: { key: 'model', label: 'Model', group: 'Vehicle Specs', sortable: true, tableDefault: true, cardDefault: true, optional: false, sortKey: 'specs.model', compactRenderer: 'text' },
  trim: { key: 'trim', label: 'Trim', group: 'Vehicle Specs', sortable: true, tableDefault: true, cardDefault: true, optional: true, sortKey: 'specs.trim', compactRenderer: 'text' },
  color: { key: 'color', label: 'Color', group: 'Vehicle Specs', sortable: true, tableDefault: true, cardDefault: true, optional: true, sortKey: 'specs.exteriorColor', compactRenderer: 'color' },
  year: { key: 'year', label: 'Year', group: 'Vehicle Specs', sortable: true, tableDefault: true, cardDefault: true, optional: false, sortKey: 'specs.year', compactRenderer: 'number' },
  mileage: { key: 'mileage', label: 'Mileage', group: 'Vehicle Specs', sortable: true, tableDefault: true, cardDefault: true, optional: false, sortKey: 'specs.mileage', compactRenderer: 'number' },
  condition: { key: 'condition', label: 'Condition', group: 'Vehicle Specs', sortable: true, tableDefault: false, cardDefault: false, optional: true, sortKey: 'specs.condition', compactRenderer: 'text' },

  // Pricing
  price: { key: 'price', label: 'Price', group: 'Pricing', sortable: true, tableDefault: true, cardDefault: true, optional: false, sortKey: 'pricing.priceCents', compactRenderer: 'currency' },

  // Media
  photos: { key: 'photos', label: 'Photos (n/x)', group: 'Media', sortable: false, tableDefault: false, cardDefault: true, optional: true, compactRenderer: 'text' },
  missingShots: { key: 'missingShots', label: 'Missing Shots', group: 'Media', sortable: true, tableDefault: false, cardDefault: false, optional: true, sortKey: 'media.missingRequiredShots', compactRenderer: 'number' },

  // Readiness / Status
  saleStatus: { key: 'saleStatus', label: 'Status', group: 'Readiness', sortable: true, tableDefault: true, cardDefault: true, optional: false, sortKey: 'readiness.status', compactRenderer: 'status' },
  nextAction: { key: 'nextAction', label: 'Next Action', group: 'Readiness', sortable: false, tableDefault: false, cardDefault: false, optional: true, compactRenderer: 'text' },

  // Publishing
  platformsStatus: { key: 'platformsStatus', label: 'Publishing', group: 'Publishing', sortable: true, tableDefault: true, cardDefault: true, optional: false, sortKey: 'publishing.severity', compactRenderer: 'publishing' },
  liveCount: { key: 'liveCount', label: 'Live (n/x)', group: 'Publishing', sortable: true, tableDefault: false, cardDefault: false, optional: true, sortKey: 'publishing.liveCount', compactRenderer: 'number' },
  queuedCount: { key: 'queuedCount', label: 'Queued (n/x)', group: 'Publishing', sortable: true, tableDefault: false, cardDefault: false, optional: true, sortKey: 'publishing.queuedCount', compactRenderer: 'number' },
  blockedCount: { key: 'blockedCount', label: 'Blocked (n/x)', group: 'Publishing', sortable: true, tableDefault: false, cardDefault: false, optional: true, sortKey: 'publishing.blockedCount', compactRenderer: 'number' },
  failedCount: { key: 'failedCount', label: 'Failed (n/x)', group: 'Publishing', sortable: true, tableDefault: false, cardDefault: false, optional: true, sortKey: 'publishing.failedCount', compactRenderer: 'number' },

  // Performance
  daysOnline: { key: 'daysOnline', label: 'Days Online', group: 'Performance', sortable: true, tableDefault: true, cardDefault: true, optional: true, sortKey: 'performance.daysOnline', compactRenderer: 'days' },
  messages: { key: 'messages', label: 'Messages', group: 'Performance', sortable: true, tableDefault: true, cardDefault: true, optional: true, sortKey: 'performance.messages', compactRenderer: 'number' },
  views: { key: 'views', label: 'Views', group: 'Performance', sortable: true, tableDefault: false, cardDefault: false, optional: true, sortKey: 'performance.views', compactRenderer: 'number' },
  saves: { key: 'saves', label: 'Saves', group: 'Performance', sortable: true, tableDefault: false, cardDefault: false, optional: true, sortKey: 'performance.saves', compactRenderer: 'number' },

  // Sales
  soldPlatform: { key: 'soldPlatform', label: 'Sold Platform', group: 'Sales', sortable: true, tableDefault: false, cardDefault: false, optional: true, sortKey: 'sales.soldPlatform', compactRenderer: 'text' },
  soldDate: { key: 'soldDate', label: 'Sold Date', group: 'Sales', sortable: true, tableDefault: false, cardDefault: false, optional: true, sortKey: 'sales.soldDate', compactRenderer: 'date' },
  soldPrice: { key: 'soldPrice', label: 'Sold Price', group: 'Sales', sortable: true, tableDefault: false, cardDefault: false, optional: true, sortKey: 'sales.soldPriceCents', compactRenderer: 'currency' },
  daysToSale: { key: 'daysToSale', label: 'Days to Sale', group: 'Sales', sortable: true, tableDefault: false, cardDefault: false, optional: true, sortKey: 'sales.daysToSale', compactRenderer: 'number' },

  // Admin
  dateAdded: { key: 'dateAdded', label: 'Date Added', group: 'Admin', sortable: true, tableDefault: false, cardDefault: false, optional: true, sortKey: 'status.addedAt', compactRenderer: 'date' },
  lastUpdated: { key: 'lastUpdated', label: 'Last Updated', group: 'Admin', sortable: true, tableDefault: false, cardDefault: false, optional: true, sortKey: 'status.lastUpdatedAt', compactRenderer: 'date' },
  lastSync: { key: 'lastSync', label: 'Last Sync', group: 'Admin', sortable: true, tableDefault: false, cardDefault: false, optional: true, sortKey: 'status.lastSyncAt', compactRenderer: 'date' },
};

export const INVENTORY_COLUMN_PRESETS: Record<string, string[]> = {
  Default: ['thumb', 'make', 'model', 'trim', 'color', 'year', 'mileage', 'price', 'saleStatus', 'platformsStatus', 'daysOnline', 'messages'],
  Media: ['thumb', 'make', 'model', 'trim', 'year', 'photos', 'missingShots'],
  Publishing: ['thumb', 'make', 'model', 'saleStatus', 'platformsStatus', 'liveCount', 'queuedCount', 'blockedCount', 'failedCount'],
  Performance: ['thumb', 'make', 'model', 'daysOnline', 'messages', 'views', 'saves'],
  Sales: ['thumb', 'make', 'model', 'year', 'price', 'saleStatus', 'soldPlatform', 'soldDate', 'soldPrice', 'daysToSale'],
  Problems: ['thumb', 'make', 'model', 'saleStatus', 'nextAction', 'missingShots', 'blockedCount', 'failedCount'],
};
