import { describe, expect, it } from 'vitest';
import { filterCatalogEntries, listCatalogEntries, loadSearchIndex } from './catalog.ts';
import { getDoc } from './registry.ts';
import { parseOperatorRoute } from '../routes.ts';
import { documentationUrl } from './urls.ts';

describe('documentation index', () => {
  it('ranks an actionable answer ahead of incidental CRM mentions', () => {
    expect(filterCatalogEntries(listCatalogEntries(), "Why didn't my lead reach my CRM?")[0].id).toBe('crm-delivery');
  });
  it('searches article bodies on demand', async () => {
    await loadSearchIndex();
    expect(filterCatalogEntries(listCatalogEntries(), 'HMAC-SHA256').some(entry => entry.id === 'connections-webhook')).toBe(true);
  });
  it('finds features through synonyms', () => {
    expect(filterCatalogEntries(listCatalogEntries(), 'csv overwrite').some(entry => entry.feature === 'inventory-import')).toBe(true);
  });
  it('keeps folder aliases working with a stable canonical URL', () => {
    expect(getDoc('inventory/csv-import')?.id).toBe('inventory-csv-import');
    expect(documentationUrl('inventory/csv-import')).toBe('#/docs/inventory-csv-import');
  });
  it('does not treat documentation URLs as dealership IDs', () => {
    const route = parseOperatorRoute('#/docs/crm-delivery?q=crm');
    expect(route.dealerId).toBeNull();
    expect(route.page).toBe('help');
  });
});
