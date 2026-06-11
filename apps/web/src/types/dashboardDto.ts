export interface DealerFinancialSummaryDto {
  totalSales: number;
  monthToDateSales: number;
  unitsSold: number;
  averageSalePrice: number;
  activeInventoryValue: number;
  averageDaysToSale: number;
  totalMessages: number;
  conversionIndicator?: string;
}

export interface PlatformSalesBreakdownDto {
  platformName: string;
  platformSlug: string;
  soldUnits: number;
  soldRevenue: number;
  messages: number;
  averageDaysOnline: number;
  conversionHint?: string;
  isTopPlatform?: boolean;
}

export interface SalesByInventorySegmentDto {
  id: string;
  grouping: string; // Year Make Model Trim
  unitsSold: number;
  averageSalePrice: number;
  averageDaysToSale: number;
  messages: number;
  bestPlatform: string;
}

export interface SalesTrendPointDto {
  date: string;
  sales: number;
  revenue: number;
  messages: number;
}

export interface InventoryValueSummaryDto {
  activeCount: number;
  activeValue: number;
  agingCount: number;
  staleCount: number;
  soldPendingRemovalCount: number;
}

export interface DealerInsightCardDto {
  id: string;
  message: string;
  type: 'positive' | 'warning' | 'neutral' | 'negative';
}

export interface FinancialPerformanceRowDto {
  id: string;
  dealerName?: string;
  vehicleDescription: string;
  platformName: string;
  platformSlug: string;
  status: 'Active' | 'Sold' | 'Pending';
  price: number;
  daysOnline: number;
  messages: number;
  views: number;
}

export interface DashboardMockData {
  financialSummary: DealerFinancialSummaryDto;
  salesByPlatform: PlatformSalesBreakdownDto[];
  salesBySegment: SalesByInventorySegmentDto[];
  salesTrend: SalesTrendPointDto[];
  inventoryValue: InventoryValueSummaryDto;
  insightCards: DealerInsightCardDto[];
  performanceData: FinancialPerformanceRowDto[];
}

export function generateMockDashboardData(dealerId?: string | null): DashboardMockData {
  // Use dealerId to maybe vary data slightly, or just return static
  const isGlobal = !dealerId;
  const multiplier = isGlobal ? 15 : 1;

  return {
    financialSummary: {
      totalSales: 1250000 * multiplier,
      monthToDateSales: 450000 * multiplier,
      unitsSold: 32 * multiplier,
      averageSalePrice: 28500,
      activeInventoryValue: 3400000 * multiplier,
      averageDaysToSale: 24,
      totalMessages: 145 * multiplier,
      conversionIndicator: '+12% vs last month',
    },
    salesByPlatform: [
      {
        platformName: 'Meta',
        platformSlug: 'meta',
        soldUnits: 14 * multiplier,
        soldRevenue: 350000 * multiplier,
        messages: 85 * multiplier,
        averageDaysOnline: 18,
        conversionHint: 'Highest lead conversion',
        isTopPlatform: true,
      },
      {
        platformName: 'OfferUp',
        platformSlug: 'offerup',
        soldUnits: 8 * multiplier,
        soldRevenue: 120000 * multiplier,
        messages: 40 * multiplier,
        averageDaysOnline: 22,
        conversionHint: 'Steady volume',
      },
      {
        platformName: 'eBay Motors',
        platformSlug: 'ebay-motors',
        soldUnits: 5 * multiplier,
        soldRevenue: 250000 * multiplier,
        messages: 12 * multiplier,
        averageDaysOnline: 35,
        conversionHint: 'High price items',
      },
      {
        platformName: 'Craigslist',
        platformSlug: 'craigslist',
        soldUnits: 5 * multiplier,
        soldRevenue: 75000 * multiplier,
        messages: 8 * multiplier,
        averageDaysOnline: 40,
        conversionHint: 'Slow conversions',
      },
    ],
    salesBySegment: [
      {
        id: '1',
        grouping: '2021 Toyota Camry SE',
        unitsSold: 6 * multiplier,
        averageSalePrice: 24000,
        averageDaysToSale: 14,
        messages: 32 * multiplier,
        bestPlatform: 'Meta',
      },
      {
        id: '2',
        grouping: '2019 Honda Civic EX',
        unitsSold: 4 * multiplier,
        averageSalePrice: 19500,
        averageDaysToSale: 18,
        messages: 25 * multiplier,
        bestPlatform: 'OfferUp',
      },
      {
        id: '3',
        grouping: '2020 Ford F-150 XLT',
        unitsSold: 3 * multiplier,
        averageSalePrice: 38000,
        averageDaysToSale: 30,
        messages: 15 * multiplier,
        bestPlatform: 'eBay Motors',
      },
    ],
    salesTrend: [
      { date: 'Mon', sales: 2 * multiplier, revenue: 50000 * multiplier, messages: 10 * multiplier },
      { date: 'Tue', sales: 4 * multiplier, revenue: 110000 * multiplier, messages: 15 * multiplier },
      { date: 'Wed', sales: 3 * multiplier, revenue: 75000 * multiplier, messages: 22 * multiplier },
      { date: 'Thu', sales: 5 * multiplier, revenue: 140000 * multiplier, messages: 30 * multiplier },
      { date: 'Fri', sales: 8 * multiplier, revenue: 230000 * multiplier, messages: 45 * multiplier },
      { date: 'Sat', sales: 6 * multiplier, revenue: 180000 * multiplier, messages: 40 * multiplier },
      { date: 'Sun', sales: 4 * multiplier, revenue: 120000 * multiplier, messages: 25 * multiplier },
    ],
    inventoryValue: {
      activeCount: 120 * multiplier,
      activeValue: 3400000 * multiplier,
      agingCount: 25 * multiplier,
      staleCount: 12 * multiplier,
      soldPendingRemovalCount: 6 * multiplier,
    },
    insightCards: [
      {
        id: 'insight-1',
        message: 'Meta generated the most messages this month.',
        type: 'positive',
      },
      {
        id: 'insight-2',
        message: '2021 Camry inventory is selling faster than average.',
        type: 'positive',
      },
      {
        id: 'insight-3',
        message: `${6 * multiplier} sold vehicles still need removal confirmation.`,
        type: 'warning',
      },
      {
        id: 'insight-4',
        message: `${12 * multiplier} vehicles over 45 days online have no messages.`,
        type: 'negative',
      },
      {
        id: 'insight-5',
        message: 'eBay has high days online but low message volume.',
        type: 'neutral',
      },
    ],
    performanceData: ([
      { id: 'veh-1', dealerName: 'Smith Auto Group', vehicleDescription: '2021 Toyota Camry SE', platformName: 'Meta', platformSlug: 'meta', status: 'Sold' as const, price: 24000, daysOnline: 14, messages: 32, views: 1240 },
      { id: 'veh-2', dealerName: 'Smith Auto Group', vehicleDescription: '2019 Honda Civic EX', platformName: 'OfferUp', platformSlug: 'offerup', status: 'Active' as const, price: 19500, daysOnline: 5, messages: 12, views: 340 },
      { id: 'veh-3', dealerName: 'Downtown Ford', vehicleDescription: '2020 Ford F-150 XLT', platformName: 'eBay Motors', platformSlug: 'ebay-motors', status: 'Sold' as const, price: 38000, daysOnline: 30, messages: 15, views: 4050 },
      { id: 'veh-4', dealerName: 'Westside Auto', vehicleDescription: '2022 Tesla Model 3', platformName: 'Meta', platformSlug: 'meta', status: 'Pending' as const, price: 35000, daysOnline: 2, messages: 45, views: 890 },
      { id: 'veh-5', dealerName: 'Smith Auto Group', vehicleDescription: '2018 Chevrolet Silverado', platformName: 'Craigslist', platformSlug: 'craigslist', status: 'Active' as const, price: 28000, daysOnline: 42, messages: 3, views: 120 },
      { id: 'veh-6', dealerName: 'Downtown Ford', vehicleDescription: '2023 Ford Mustang GT', platformName: 'Meta', platformSlug: 'meta', status: 'Active' as const, price: 45000, daysOnline: 10, messages: 28, views: 2100 },
      { id: 'veh-7', dealerName: 'Westside Auto', vehicleDescription: '2017 Honda Accord LX', platformName: 'OfferUp', platformSlug: 'offerup', status: 'Sold' as const, price: 16000, daysOnline: 8, messages: 18, views: 560 },
      { id: 'veh-8', dealerName: 'Smith Auto Group', vehicleDescription: '2021 Jeep Wrangler Unlimited', platformName: 'eBay Motors', platformSlug: 'ebay-motors', status: 'Pending' as const, price: 42000, daysOnline: 15, messages: 22, views: 3200 },
      { id: 'veh-9', dealerName: 'Downtown Ford', vehicleDescription: '2015 Toyota Corolla LE', platformName: 'Craigslist', platformSlug: 'craigslist', status: 'Sold' as const, price: 12000, daysOnline: 3, messages: 55, views: 1800 },
      { id: 'veh-10', dealerName: 'Westside Auto', vehicleDescription: '2020 BMW 330i', platformName: 'Meta', platformSlug: 'meta', status: 'Active' as const, price: 32000, daysOnline: 25, messages: 14, views: 1500 },
    ] as FinancialPerformanceRowDto[]).filter(item => isGlobal || item.dealerName === 'Smith Auto Group')
  };
}
