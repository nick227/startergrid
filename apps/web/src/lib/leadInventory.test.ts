import { describe, expect, it } from 'vitest';
import { leadInventoryScope, leadRecordStock, leadRecordTitle, leadTaskReference } from './leadInventory.ts';

const book = {
  inventoryIdentity: { source: 'category_item' as const, inventoryId: 'me_books_digital_1', dealershipId: 'dealer_me_books' },
  categoryItemId: 'me_books_digital_1',
  categoryItem: {
    id: 'me_books_digital_1',
    categoryId: 'EBOOKS',
    title: 'Harbor Field Notes — Digital Demo',
    stockNumber: 'ME-DIGITAL-001',
    soldAt: null,
    thumbnailUrl: '/demo-assets/multi-entity-books.svg',
  },
  vehicleId: null,
  vehicle: null,
};

describe('lead inventory identity', () => {
  it('names a category item from the API and never invents a vehicle', () => {
    expect(leadRecordTitle(book)).toBe('Harbor Field Notes — Digital Demo');
    expect(leadRecordStock(book)).toBe('ME-DIGITAL-001');
    expect(leadInventoryScope(book)).toEqual({
      assetId: 'me_books_digital_1',
      inventorySource: 'category_item',
      assetRef: 'ME-DIGITAL-001',
    });
  });

  it('keeps a vehicle inquiry on the vehicle the API returned', () => {
    const lead = {
      inventoryIdentity: { source: 'vehicle' as const, inventoryId: 'me_marine_1', dealershipId: 'dealer_me_marine' },
      vehicleId: 'me_marine_1',
      vehicle: { year: 2024, make: 'Demo Marine', model: 'Bay 180', stockNumber: 'ME-MARINE-1', soldAt: null },
    };
    expect(leadRecordTitle(lead)).toBe('2024 Demo Marine Bay 180');
    expect(leadInventoryScope(lead)?.inventorySource).toBe('vehicle');
  });

  it('does not open inventory when the identity is missing', () => {
    expect(leadInventoryScope({ vehicleId: null, vehicle: null })).toBeNull();
    expect(leadRecordTitle({ vehicleId: null, vehicle: null })).toBe('Inventory record unavailable');
  });

  it('links a team task to the inquiry, which the team API accepts', () => {
    expect(leadTaskReference('dealer_me_books', 'lead_1')).toBe('#/dealer_me_books/activity/leads?leadId=lead_1');
  });
});
