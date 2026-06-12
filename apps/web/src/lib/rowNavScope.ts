/** Asset context passed from OpsRowCard actions into queue/history/inventory routes. */

export type RowNavScope = {
  assetRef?: string;
  assetId?: string;
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
  return {
    ...(assetRef ? { assetRef } : {}),
    ...(assetId ? { assetId } : {}),
  };
}

export function splitOperatorHash(hash: string): { path: string; query: string } {
  const raw = hash.replace(/^#/, '');
  const q = raw.indexOf('?');
  if (q < 0) return { path: raw, query: '' };
  return { path: raw.slice(0, q), query: raw.slice(q + 1) };
}

export function appendRowNavScope(baseHash: string, scope?: RowNavScope): string {
  if (!scope?.assetRef && !scope?.assetId) return baseHash;
  const { path, query } = splitOperatorHash(baseHash);
  const params = new URLSearchParams(query);
  if (scope.assetRef) params.set('ref', scope.assetRef);
  if (scope.assetId) params.set('assetId', scope.assetId);
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
  payload: unknown;
}): RowNavScope | undefined {
  if (event.vehicleId) return { assetId: event.vehicleId };
  const ref = stockNumberFromPayload(event.payload);
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
  payload: unknown;
}): string {
  const parts = [event.kind, event.platformSlug ?? '', event.vehicleId ?? ''];
  if (event.payload && typeof event.payload === 'object') {
    parts.push(JSON.stringify(event.payload));
  }
  return parts.join(' ').toLowerCase();
}
