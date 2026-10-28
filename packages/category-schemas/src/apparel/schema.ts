import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { apparelCopy } from './copy.en.js';
import { apparelFormatters } from './formatters.js';

export const apparelSchema: CategorySchema = {
  id: 'APPAREL',
  status: 'active',
  lifecycleMode: 'physical_inventory',
  inventorySource: 'category_item',
  label: 'Apparel',
  copy: apparelCopy,
  asset: {
    singular: 'item',
    plural: 'items',
    refLabel: 'SKU',
    idLabel: 'SKU',
    titleLabel: 'Item',
    idFieldKey: 'sku',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'SKU', kind: 'identifier' },
    { key: 'barcode', label: 'Barcode', kind: 'identifier', filterStorage: { storage: 'categoryPayload', payloadKey: 'barcode' } },
    { key: 'title', label: 'Style', kind: 'text', marketplaceFilter: 'model', filterStorage: { storage: 'categoryPayload', payloadKey: 'title' } },
    { key: 'brand', label: 'Brand', kind: 'text', marketplaceFilter: 'brand', filterStorage: { storage: 'categoryPayload', payloadKey: 'brand' } },
    { key: 'size', label: 'Size', kind: 'text', filterStorage: { storage: 'categoryPayload', payloadKey: 'size' } },
    { key: 'priceCents', label: 'Price', kind: 'currency', marketplaceFilter: 'price' },
    { key: 'condition', label: 'Condition', kind: 'enum', options: [ { value: 'NEW', label: 'New' }, { value: 'USED', label: 'Used' }, { value: 'VINTAGE', label: 'Vintage' } ] },
    ...['color', 'material', 'era', 'measurements', 'conditionNotes'].map(key => ({ key, label: key === 'conditionNotes' ? 'Condition notes' : key[0]!.toUpperCase() + key.slice(1), kind: 'text' as const, filterStorage: { storage: 'categoryPayload' as const, payloadKey: key } })),
  ],
  lifecycle: { active: 'Active', sold: 'Sold', removed: 'Removed' },
  readiness: { ...genericReadiness },
  performance: { movementLabel: 'Sales pace', benchmarksLabel: 'Sales comparison' },
  formatters: apparelFormatters,
  marketplace: buildMarketplaceMeta('APPAREL', 'Apparel', {
    consumerEnabled: true,
    tagline: 'Browse apparel from participating sellers',
  }),
  fulfillmentPolicy: {
    allowedModes: ['third_party_shipping', 'contact_seller'],
    defaultMode: 'third_party_shipping',
    methodLabel: 'Shipping available',
    timingLabel: 'Seller-provided timing',
    costLabel: 'Shipping may cost extra',
  },
};

/** @deprecated use apparelSchema */
export const schema = apparelSchema;
