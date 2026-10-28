export type StockCounts = {
  total: number;
  ready: number;
  needsAttention: number;
  sold: number;
};

type CountableItem = {
  listingStatus: string;
  soldAt: string | null;
  removedAt: string | null;
};

export function countCategoryItems(items: CountableItem[]): StockCounts {
  let ready = 0;
  let needsAttention = 0;
  let sold = 0;
  for (const item of items) {
    if (item.soldAt || item.removedAt) sold += 1;
    else if (item.listingStatus === 'READY') ready += 1;
    else needsAttention += 1;
  }
  return { total: items.length, ready, needsAttention, sold };
}

export function addStockCounts(vehicles: StockCounts, categoryItems: StockCounts): StockCounts {
  return {
    total: vehicles.total + categoryItems.total,
    ready: vehicles.ready + categoryItems.ready,
    needsAttention: vehicles.needsAttention + categoryItems.needsAttention,
    sold: vehicles.sold + categoryItems.sold,
  };
}
