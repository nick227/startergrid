/** Asset context passed from OpsRowCard actions into queue/history/inventory routes. */

export type RowNavScope = {
  assetRef?: string;
  assetId?: string;
  filter?: string;
  ids?: string[];
  search?: string;
  leadId?: string;
  /** Opens the CRM handoff for this inquiry. A lead link without it stays on the inquiry. */
  handoff?: 'crm';
  /** Which inventory table assetId belongs to. Absent means the existing vehicle lookup. */
  inventorySource?: 'vehicle' | 'category_item';
};

function slugPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function inventoryItemSlug(item: {
  assetTitle?: string | null;
  assetRef?: string | null;
  stockNumber?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
}): string {
  const title = item.assetTitle
    ?? [item.year, item.make, item.model].filter(v => v !== null && v !== undefined && String(v).trim()).join(' ');
  const ref = item.assetRef ?? item.stockNumber ?? '';
  const slug = [title, ref].map(v => slugPart(String(v))).filter(Boolean).join('-');
  return slug || 'item';
}

export function parseRowNavScope(queryString: string): RowNavScope {
  if (!queryString) return {};
  const params = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : queryString);
  const assetRef = params.get('ref') ?? params.get('assetRef') ?? undefined;
  const assetId = params.get('assetId') ?? undefined;
  const filter = params.get('filter') ?? undefined;
  const search = params.get('search') ?? params.get('q') ?? undefined;
  const leadId = params.get('leadId') ?? undefined;
  const handoff = params.get('handoff') === 'crm' ? 'crm' as const : undefined;
  const sourceParam = params.get('inventorySource');
  const inventorySource = sourceParam === 'vehicle' || sourceParam === 'category_item' ? sourceParam : undefined;
  const rawIds = params.get('ids');
  const ids = rawIds ? rawIds.split(',').filter(Boolean) : undefined;
  return {
    ...(assetRef ? { assetRef } : {}),
    ...(assetId ? { assetId } : {}),
    ...(filter ? { filter } : {}),
    ...(search ? { search } : {}),
    ...(leadId ? { leadId } : {}),
    ...(handoff ? { handoff } : {}),
    ...(inventorySource ? { inventorySource } : {}),
    ...(ids ? { ids } : {}),
  };
}

export function splitOperatorHash(hash: string): { path: string; query: string } {
  const raw = hash.replace(/^#/, '');
  const q = raw.indexOf('?');
  if (q < 0) return { path: raw, query: '' };
  return { path: raw.slice(0, q), query: raw.slice(q + 1) };
}

export function appendRowNavScope(baseHash: string, scope?: RowNavScope): string {
  if (!scope) return baseHash;
  const hasValues = scope.assetRef || scope.assetId || scope.filter || scope.search || scope.leadId || scope.handoff || scope.inventorySource || (scope.ids && scope.ids.length > 0);
  if (!hasValues) return baseHash;
  const { path, query } = splitOperatorHash(baseHash);
  const params = new URLSearchParams(query);
  if (scope.assetRef) params.set('ref', scope.assetRef);
  if (scope.assetId) params.set('assetId', scope.assetId);
  if (scope.filter) params.set('filter', scope.filter);
  if (scope.search) params.set('search', scope.search);
  if (scope.leadId) params.set('leadId', scope.leadId);
  if (scope.handoff) params.set('handoff', scope.handoff);
  if (scope.inventorySource) params.set('inventorySource', scope.inventorySource);
  if (scope.ids && scope.ids.length > 0) params.set('ids', scope.ids.join(','));
  const qs = params.toString();
  return qs ? `#${path}?${qs}` : `#${path}`;
}

export function assetRowScope(asset: { id: string; stockNumber: string }): RowNavScope {
  return { assetRef: asset.stockNumber, assetId: asset.id };
}

export function queueItemRowScope(item: {
  assetRef: string | null;
  assetId: string | null;
}): RowNavScope | undefined {
  if (!item.assetRef && !item.assetId) return undefined;
  return {
    ...(item.assetRef ? { assetRef: item.assetRef } : {}),
    ...(item.assetId ? { assetId: item.assetId } : {}),
  };
}

export function performanceItemRowScope(item: {
  vehicleId: string;
  stockNumber: string;
}): RowNavScope {
  return { assetRef: item.stockNumber, assetId: item.vehicleId };
}

export function historyEventRowScope(event: {
  vehicleId: string | null;
  stockNumber?: string | null;
  payload: unknown;
}): RowNavScope | undefined {
  if (event.vehicleId) {
    return {
      assetId: event.vehicleId,
      ...(event.stockNumber ? { assetRef: event.stockNumber } : {}),
    };
  }
  const ref = event.stockNumber ?? stockNumberFromPayload(event.payload);
  return ref ? { assetRef: ref } : undefined;
}

function stockNumberFromPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const record = payload as Record<string, unknown>;
  const raw = record.stockNumber ?? record.stock_number ?? record.assetRef;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

export function syncEventSearchBlob(event: {
  kind: string;
  platformSlug: string | null;
  vehicleId: string | null;
  assetTitle?: string | null;
  stockNumber?: string | null;
  payload: unknown;
}): string {
  const parts = [
    event.kind,
    event.platformSlug ?? '',
    event.vehicleId ?? '',
    event.assetTitle ?? '',
    event.stockNumber ?? '',
  ];
  if (event.payload && typeof event.payload === 'object') {
    parts.push(JSON.stringify(event.payload));
  }
  return parts.join(' ').toLowerCase();
}
