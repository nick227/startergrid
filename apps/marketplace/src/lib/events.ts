import { MarketplaceService, MarketplaceChannelEventRequest, type MarketplaceChannelEventRequest as MarketplaceTrackEvent } from '@dealer-marketplace/client';

export type { MarketplaceTrackEvent };
export const MarketplaceEventType = MarketplaceChannelEventRequest.eventType;

export function trackMarketplaceEvent(event: MarketplaceTrackEvent): void {
  void MarketplaceService.captureMarketplaceChannelEvent({
    requestBody: event,
  }).catch(() => {
    // Measurement must not interrupt browsing.
  });
}
