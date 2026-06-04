import type {
  IntegrationClass,
  PlatformProfileSeed,
  VehicleUpdateEvent,
  VehicleUpdateKind,
  VehicleUpdatePropagation
} from '../lib/types.js';

type UpdateAction = VehicleUpdatePropagation['action'];

function actionFor(kind: VehicleUpdateKind, integrationClass: IntegrationClass): UpdateAction {
  if (kind === 'SOLD' || kind === 'REMOVED') return 'REMOVE_LISTING';
  if (integrationClass === 'OWNED') return 'DELTA_UPDATE';
  if (integrationClass === 'FEEDABLE') return 'FEED_REFRESH';
  if (integrationClass === 'ASSISTED') return 'UPDATE_PACKET';
  if (integrationClass === 'PARTNER_DEPENDENT') return 'UPDATE_PACKET';
  return 'NO_ACTION';
}

function notesFor(kind: VehicleUpdateKind, platform: PlatformProfileSeed, action: UpdateAction): string {
  const name = platform.name;
  switch (action) {
    case 'REMOVE_LISTING':
      return `${kind === 'SOLD' ? 'Vehicle marked sold' : 'Vehicle removed'} — listing will be deactivated on ${name}. Feed or API will mark availability as out_of_stock/removed.`;
    case 'DELTA_UPDATE':
      return `Direct API update sent to ${name}. Change applied immediately on the owned storefront.`;
    case 'FEED_REFRESH':
      return `${name} feed flagged for refresh. Updated vehicle data will be picked up on next scheduled crawl or manual re-submit.`;
    case 'UPDATE_PACKET':
      return `Update notification packet generated for ${name}. Requires manual re-submission or partner contact to apply the change.`;
    default:
      return `No propagation action required for ${name}.`;
  }
}

function deltaPayloadFor(event: VehicleUpdateEvent, platform: PlatformProfileSeed, action: UpdateAction): Record<string, unknown> {
  const base = { platformSlug: platform.slug, stockNumber: event.stockNumber, updateKind: event.kind };

  switch (action) {
    case 'REMOVE_LISTING':
      return { ...base, operation: 'REMOVE', availability: 'out_of_stock', soldAt: event.kind === 'SOLD' ? new Date().toISOString() : undefined };
    case 'DELTA_UPDATE':
      return { ...base, operation: 'PATCH', changes: event.newValue ?? {} };
    case 'FEED_REFRESH':
      return { ...base, operation: 'FEED_REFRESH_REQUESTED', scheduledAt: new Date().toISOString(), changedFields: event.newValue ? Object.keys(event.newValue) : [] };
    case 'UPDATE_PACKET':
      return {
        ...base,
        operation: 'MANUAL_UPDATE_REQUIRED',
        previousValue: event.previousValue ?? null,
        newValue: event.newValue ?? null,
        partnerContact: (platform.integrationUrls as Record<string, string> | undefined)?.['supportUrl'] ?? null
      };
    default:
      return base;
  }
}

export function propagateVehicleUpdate(
  event: VehicleUpdateEvent,
  activePlatforms: PlatformProfileSeed[]
): VehicleUpdatePropagation[] {
  return activePlatforms.map(platform => {
    const action = actionFor(event.kind, platform.integrationClass);
    return {
      platformSlug: platform.slug,
      platformName: platform.name,
      integrationClass: platform.integrationClass,
      action,
      payload: deltaPayloadFor(event, platform, action),
      notes: notesFor(event.kind, platform, action)
    };
  });
}

export function summarizeUpdatePropagations(propagations: VehicleUpdatePropagation[]): {
  immediate: number;
  feedRefresh: number;
  manualRequired: number;
  removed: number;
} {
  return {
    immediate: propagations.filter(p => p.action === 'DELTA_UPDATE').length,
    feedRefresh: propagations.filter(p => p.action === 'FEED_REFRESH').length,
    manualRequired: propagations.filter(p => p.action === 'UPDATE_PACKET').length,
    removed: propagations.filter(p => p.action === 'REMOVE_LISTING').length
  };
}
