import type { PrismaClient } from '@prisma/client';
import { platformProfiles } from '../../data/platformProfiles.js';
import { brandName } from '../channels/channelSetupService.js';

export type BusinessEvent = { id: string; category: string; title: string; detail: string; occurredAt: string; href: string; count: number };
export function groupBusinessEvents(events: BusinessEvent[]): BusinessEvent[] {
  const groups = new Map<string, BusinessEvent>();
  for (const event of events) {
    const existing = groups.get(event.id);
    if (existing) {
      existing.count += event.count;
      if (event.occurredAt > existing.occurredAt) existing.occurredAt = event.occurredAt;
    } else groups.set(event.id, { ...event });
  }
  return [...groups.values()].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id));
}

export type ActivityCursor = { anchor: string; offsets: number[] };
export async function businessActivity(db: PrismaClient, dealershipId: string, cursor?: ActivityCursor) {
  const anchor = cursor?.anchor ?? new Date().toISOString();
  const offsets = cursor?.offsets ?? Array<number>(7).fill(0);
  const createdAt = { lte: new Date(anchor) };
  const options = { where: { dealershipId, createdAt }, orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }], take: 100 };
  const [leads, vehicles, lifecycle, updates, sync, imports, deliveries] = await Promise.all([
    db.lead.findMany({ ...options, skip: offsets[0] }), db.vehicle.findMany({ ...options, skip: offsets[1] }),
    db.vehicleLifecycleEvent.findMany({ ...options, skip: offsets[2], where: { ...options.where, ingressRunId: null }, include: { vehicle: true } }),
    db.vehicleUpdate.findMany({ ...options, skip: offsets[3], where: { ...options.where, kind: 'PRICE_CHANGE' }, include: { vehicle: true } }),
    db.syncEvent.findMany({ ...options, skip: offsets[4], where: { ...options.where, kind: { in: ['SUBMISSION_SENT', 'DISPATCH_FAILED', 'ACCOUNT_UPDATED', 'PARTNER_FOLLOWUP', 'POLICY_CHANGED'] } } }),
    db.ingressRun.findMany({ ...options, skip: offsets[5] }),
    db.leadDeliveryAttempt.findMany({ ...options, skip: offsets[6], where: { dealershipId, updatedAt: createdAt }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }] }),
  ]);
  const root = `#/${encodeURIComponent(dealershipId)}`;
  const vehicleLink = (id: string) => `${root}/inventory?assetId=${encodeURIComponent(id)}`;
  const leadLink = (id: string) => `${root}/activity/leads?leadId=${encodeURIComponent(id)}`;
  // A common watermark avoids skipping records when one source reaches its page limit.
  const batches = [leads, vehicles, lifecycle, updates, sync, imports];
  const boundaries = batches.filter(rows => rows.length === 100).map(rows => rows[99]!.createdAt.getTime());
  if (deliveries.length === 100) boundaries.push(deliveries[99]!.updatedAt.getTime());
  const watermark = boundaries.length ? Math.max(...boundaries) : null;
  const events: BusinessEvent[] = [];
  const add = (id: string, category: string, title: string, detail: string, date: Date, href: string) => events.push({ id, category, title, detail, occurredAt: date.toISOString(), href, count: 1 });
  for (const r of leads) add(`lead:${r.id}`, 'leads', 'New buyer inquiry', `${r.contactName || 'Buyer'} · ${channelName(r.platformSlug)}`, r.createdAt, leadLink(r.id));
  const additions = new Map<string, typeof vehicles>();
  for (const r of vehicles.filter(v => watermark === null || v.createdAt.getTime() >= watermark)) { const key = r.createdAt.toISOString().slice(0, 16); additions.set(key, [...(additions.get(key) ?? []), r]); }
  for (const rows of additions.values()) {
    const r = rows[0]!;
    add(`vehicle:${r.id}`, 'vehicles', rows.length > 1 ? `${rows.length} vehicles added` : 'Vehicle added', rows.length > 1 ? 'Open the affected inventory records' : `${r.year} ${r.make} ${r.model} · ${r.stockNumber}`, r.createdAt, rows.length > 1 ? `${root}/inventory?ids=${rows.map(v => encodeURIComponent(v.id)).join(',')}` : vehicleLink(r.id));
  }
  for (const r of lifecycle) add(`lifecycle:${r.id}`, 'vehicles', `Vehicle ${r.toState.toLowerCase()}`, r.vehicle.stockNumber, r.createdAt, vehicleLink(r.vehicleId));
  for (const r of updates) add(`update:${r.id}`, 'vehicles', 'Vehicle price changed', r.vehicle.stockNumber, r.createdAt, vehicleLink(r.vehicleId));
  const labels: Record<string, string> = { SUBMISSION_SENT: 'Listing submission sent', DISPATCH_FAILED: 'Listing submission failed', ACCOUNT_UPDATED: 'Channel connection changed', PARTNER_FOLLOWUP: 'Channel follow-up recorded', POLICY_CHANGED: 'Publishing settings changed' };
  for (const r of sync) add(r.syncRunId ? `batch:${r.syncRunId}:${r.platformSlug}:${r.kind}` : `sync:${r.id}`, 'channels', labels[r.kind] ?? 'Channel activity', channelName(r.platformSlug), r.createdAt, r.platformSlug ? `${root}/channels/${encodeURIComponent(r.platformSlug)}/activity` : r.vehicleId ? vehicleLink(r.vehicleId) : `${root}/platforms`);
  for (const r of imports) add(`import:${r.id}`, 'imports', `Inventory import ${r.status.toLowerCase().replaceAll('_', ' ')}`, `${r.createdCount} added · ${r.updatedCount} updated · ${r.errorCount} errors`, r.createdAt, `${root}/inventory?importRunId=${encodeURIComponent(r.id)}`);
  for (const r of deliveries) add(`delivery:${r.id}`, 'crm', `CRM delivery ${r.status.toLowerCase().replaceAll('_', ' ')}`, r.destinationLabel, r.updatedAt, leadLink(r.leadId));
  const nextOffsets = [...batches.map((rows, i) => offsets[i]! + rows.filter(r => watermark === null || r.createdAt.getTime() >= watermark).length), offsets[6]! + deliveries.filter(r => watermark === null || r.updatedAt.getTime() >= watermark).length];
  return { events: groupBusinessEvents(events.filter(e => watermark === null || Date.parse(e.occurredAt) >= watermark)), nextCursor: watermark === null ? null : Buffer.from(JSON.stringify({ anchor, offsets: nextOffsets })).toString('base64url') };

}

function channelName(slug: string | null): string {
  if (!slug) return 'Publishing';
  const profile = platformProfiles.find(p => p.slug === slug);
  return profile ? brandName(profile.name) : slug;
}

export async function salesRegister(db: PrismaClient, dealershipId: string) {
  const vehicles = await db.vehicle.findMany({ where: { dealershipId, soldAt: { not: null } }, include: { saleRecord: true }, orderBy: { soldAt: 'desc' }, take: 501 });
  return { truncated: vehicles.length > 500, sales: vehicles.slice(0, 500).map(v => ({
    vehicleId: v.id, stockNumber: v.stockNumber, title: `${v.year} ${v.make} ${v.model}`,
    inventoryOutcome: 'Sold', statusChangedAt: v.soldAt,
    transactionDate: v.saleRecord?.transactionDate ?? null, salePriceCents: v.saleRecord?.salePriceCents ?? null,
    channel: v.saleRecord?.confirmedChannelSlug ?? null, evidence: v.saleRecord?.sourceConfidence ?? null,
  })) };
}
