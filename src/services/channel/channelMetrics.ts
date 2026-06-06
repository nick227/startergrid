// Neutral channel event types and metric vocabulary shared across services.

export const MARKETPLACE_PLATFORM_SLUG = 'consumer-marketplace';

export type MetricConfidence =
  | 'observed_first_party'
  | 'platform_reported'
  | 'manual_imported'
  | 'unavailable';

export type ChannelMetric = {
  count: number;
  confidence: MetricConfidence;
};

export type ChannelMetrics = {
  views?:            ChannelMetric;
  detailViews?:      ChannelMetric;
  inquiries?:        ChannelMetric;
  reportedClicks?:   ChannelMetric;
  reportedContacts?: ChannelMetric;
};

export type ChannelEventInput = {
  platformSlug:     string;
  eventType:        string;
  sourceConfidence: string;
  quantity:         number;
  vehicleId?:       string | null;
};

export const PUBLIC_MARKETPLACE_EVENT_TYPES = [
  'vehicle_impression',
  'vehicle_detail_view',
  'dealer_page_view',
] as const;

export type PublicMarketplaceEventType = typeof PUBLIC_MARKETPLACE_EVENT_TYPES[number];

const API_TO_DB_EVENT: Record<PublicMarketplaceEventType, string> = {
  vehicle_impression:  'VEHICLE_IMPRESSION',
  vehicle_detail_view: 'VEHICLE_DETAIL_VIEW',
  dealer_page_view:    'DEALER_PAGE_VIEW',
};

export function parsePublicMarketplaceEventType(raw: string): string | null {
  if ((PUBLIC_MARKETPLACE_EVENT_TYPES as readonly string[]).includes(raw)) {
    return API_TO_DB_EVENT[raw as PublicMarketplaceEventType];
  }
  return null;
}

export function mergeMetricConfidence(
  current: MetricConfidence | undefined,
  incoming: MetricConfidence,
): MetricConfidence {
  const rank: Record<MetricConfidence, number> = {
    observed_first_party: 4,
    platform_reported:    3,
    manual_imported:      2,
    unavailable:          1,
  };
  if (!current) return incoming;
  return rank[incoming] >= rank[current] ? incoming : current;
}

export function normalizeSourceConfidence(raw: string): MetricConfidence {
  switch (raw) {
    case 'OBSERVED_FIRST_PARTY':
    case 'observed_first_party':
      return 'observed_first_party';
    case 'PLATFORM_REPORTED':
    case 'platform_reported':
      return 'platform_reported';
    case 'MANUAL_IMPORTED':
    case 'manual_imported':
      return 'manual_imported';
    default:
      return 'unavailable';
  }
}

export function aggregateChannelMetrics(events: ChannelEventInput[]): ChannelMetrics {
  const sums = {
    views:            0,
    detailViews:      0,
    inquiries:        0,
    reportedClicks:   0,
    reportedContacts: 0,
  };
  const conf: Partial<Record<keyof typeof sums, MetricConfidence>> = {};

  for (const ev of events) {
    const qty = ev.quantity > 0 ? ev.quantity : 1;
    const c = normalizeSourceConfidence(ev.sourceConfidence);

    switch (ev.eventType) {
      case 'VEHICLE_IMPRESSION':
      case 'DEALER_PAGE_VIEW':
      case 'REPORTED_VIEW':
        sums.views += qty;
        conf.views = mergeMetricConfidence(conf.views, c);
        break;
      case 'VEHICLE_DETAIL_VIEW':
        sums.detailViews += qty;
        conf.detailViews = mergeMetricConfidence(conf.detailViews, c);
        break;
      case 'INQUIRY_SUBMITTED':
      case 'REPORTED_CONTACT':
        if (ev.eventType === 'INQUIRY_SUBMITTED') {
          sums.inquiries += qty;
          conf.inquiries = mergeMetricConfidence(conf.inquiries, c);
        } else {
          sums.reportedContacts += qty;
          conf.reportedContacts = mergeMetricConfidence(conf.reportedContacts, c);
        }
        break;
      case 'REPORTED_CLICK':
        sums.reportedClicks += qty;
        conf.reportedClicks = mergeMetricConfidence(conf.reportedClicks, c);
        break;
    }
  }

  const out: ChannelMetrics = {};
  if (sums.views > 0 && conf.views) out.views = { count: sums.views, confidence: conf.views };
  if (sums.detailViews > 0 && conf.detailViews) {
    out.detailViews = { count: sums.detailViews, confidence: conf.detailViews };
  }
  if (sums.inquiries > 0 && conf.inquiries) {
    out.inquiries = { count: sums.inquiries, confidence: conf.inquiries };
  }
  if (sums.reportedClicks > 0 && conf.reportedClicks) {
    out.reportedClicks = { count: sums.reportedClicks, confidence: conf.reportedClicks };
  }
  if (sums.reportedContacts > 0 && conf.reportedContacts) {
    out.reportedContacts = { count: sums.reportedContacts, confidence: conf.reportedContacts };
  }
  return out;
}

export function formatChannelMetricsLine(metrics: ChannelMetrics | null | undefined): string | null {
  if (!metrics) return null;
  const parts: string[] = [];
  if (metrics.views) parts.push(`${metrics.views.count.toLocaleString()} views`);
  if (metrics.detailViews) parts.push(`${metrics.detailViews.count.toLocaleString()} detail views`);
  if (metrics.inquiries) parts.push(`${metrics.inquiries.count.toLocaleString()} inquiries`);
  if (metrics.reportedClicks) parts.push(`${metrics.reportedClicks.count.toLocaleString()} clicks`);
  if (metrics.reportedContacts) parts.push(`${metrics.reportedContacts.count.toLocaleString()} contacts`);
  return parts.length > 0 ? parts.join(' · ') : null;
}
