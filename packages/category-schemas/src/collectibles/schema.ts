import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { collectiblesCopy } from './copy.en.js';
import { collectiblesFormatters } from './formatters.js';

export const collectiblesSchema: CategorySchema = {
  id: 'COLLECTIBLES',
  status: 'placeholder',
  lifecycleMode: 'physical_inventory',
  label: 'Collectibles',
  copy: collectiblesCopy,
  asset: {
    singular: 'item',
    plural: 'items',
    refLabel: 'Listing #',
    idLabel: 'Cert #',
    titleLabel: 'Item',
    idFieldKey: 'vin',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'Listing #', kind: 'identifier' },
    { key: 'vin', label: 'Cert #', kind: 'identifier' },
    { key: 'year', label: 'Year', kind: 'number', marketplaceFilter: 'year' },
    { key: 'make', label: 'Franchise', kind: 'text', marketplaceFilter: 'brand' },
    { key: 'model', label: 'Item', kind: 'text', marketplaceFilter: 'model' },
    { key: 'trim', label: 'Grade', kind: 'text' },
    { key: 'priceCents', label: 'Price', kind: 'currency', marketplaceFilter: 'price' },
    { key: 'condition', label: 'Condition', kind: 'text', marketplaceFilter: 'condition' },
  ],
  lifecycle: { active: 'Listed', sold: 'Sold', removed: 'Delisted' },
  readiness: { ...genericReadiness },
  performance: { movementLabel: 'Sales pace', benchmarksLabel: 'Sales comparison' },
  formatters: collectiblesFormatters,
  marketplace: buildMarketplaceMeta('COLLECTIBLES', 'Collectibles', {
    consumerEnabled: false,
    tagline: 'Browse collectibles from participating sellers',
  }),
  fulfillmentPolicy: {
    allowedModes: ['third_party_shipping', 'contact_seller'],
    defaultMode: 'third_party_shipping',
    methodLabel: 'Shipping available',
    timingLabel: 'Seller-provided timing',
    costLabel: 'Shipping may cost extra',
  },
};

/** @deprecated use collectiblesSchema */
export const schema = collectiblesSchema;
