import type { RowNavScope } from './rowNavScope.ts';

/** Identity the leads API returns. Do not infer this from the id string. */
export type LeadInventoryIdentity = {
  source: 'vehicle' | 'category_item';
  inventoryId: string;
  dealershipId: string;
};

export type LeadCategoryItem = {
  id: string;
  categoryId: string;
  title: string | null;
  stockNumber: string | null;
  soldAt: string | null;
  thumbnailUrl: string | null;
};

export type LeadInventoryLead = {
  inventoryIdentity?: LeadInventoryIdentity | null;
  categoryItemId?: string | null;
  categoryItem?: LeadCategoryItem | null;
  vehicleId?: string | null;
  vehicle?: {
    year?: number | null;
    make?: string | null;
    model?: string | null;
    stockNumber?: string | null;
    soldAt?: string | null;
    thumbnailUrl?: string | null;
  } | null;
};

export function leadRecordTitle(lead: LeadInventoryLead): string {
  const source = lead.inventoryIdentity?.source;
  if (source === 'category_item') {
    return lead.categoryItem?.title?.trim() || 'This item is no longer in inventory';
  }
  if (source === 'vehicle' || lead.vehicle) {
    if (!lead.vehicle) return 'This vehicle is no longer in inventory';
    const title = `${lead.vehicle.year ?? ''} ${lead.vehicle.make ?? ''} ${lead.vehicle.model ?? ''}`.replace(/\s+/g, ' ').trim();
    return title || 'Vehicle';
  }
  return 'Inventory record unavailable';
}

export function leadRecordStock(lead: LeadInventoryLead): string | null {
  if (lead.inventoryIdentity?.source === 'category_item') return lead.categoryItem?.stockNumber ?? null;
  return lead.vehicle?.stockNumber ?? null;
}

export function leadRecordSoldAt(lead: LeadInventoryLead): string | null {
  if (lead.inventoryIdentity?.source === 'category_item') return lead.categoryItem?.soldAt ?? null;
  return lead.vehicle?.soldAt ?? null;
}

export function leadRecordThumbnail(lead: LeadInventoryLead): string | null {
  if (lead.inventoryIdentity?.source === 'category_item') return lead.categoryItem?.thumbnailUrl ?? null;
  return lead.vehicle?.thumbnailUrl ?? null;
}

/** Opens the inventory record named by the API. Category items never become vehicles. */
export function leadInventoryScope(lead: LeadInventoryLead): RowNavScope | null {
  const identity = lead.inventoryIdentity;
  if (identity?.source === 'category_item' && identity.inventoryId) {
    return {
      assetId: identity.inventoryId,
      inventorySource: 'category_item',
      ...(lead.categoryItem?.stockNumber ? { assetRef: lead.categoryItem.stockNumber } : {}),
    };
  }
  if (identity?.source === 'vehicle' && identity.inventoryId) {
    return {
      assetId: identity.inventoryId,
      inventorySource: 'vehicle',
      ...(lead.vehicle?.stockNumber ? { assetRef: lead.vehicle.stockNumber } : {}),
    };
  }
  if (!identity && lead.vehicleId) {
    return {
      assetId: lead.vehicleId,
      inventorySource: 'vehicle',
      ...(lead.vehicle?.stockNumber ? { assetRef: lead.vehicle.stockNumber } : {}),
    };
  }
  return null;
}

export function leadTaskReference(dealerId: string, leadId: string): string {
  return `#/${encodeURIComponent(dealerId)}/activity/leads?leadId=${encodeURIComponent(leadId)}`;
}
