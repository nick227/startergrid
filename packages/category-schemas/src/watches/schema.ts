import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { watchesCopy } from './copy.en.js';
import { watchesFormatters } from './formatters.js';

export const watchesSchema: CategorySchema = {
  id: 'WATCHES',
  status: 'placeholder',
  lifecycleMode: 'physical_inventory',
  label: 'Watches',
  copy: watchesCopy,
  asset: {
    singular: 'watch',
    plural: 'watches',
    refLabel: 'Stock #',
    idLabel: 'Reference #',
    titleLabel: 'Watch',
    idFieldKey: 'vin',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'Stock #', kind: 'identifier' },
    { key: 'vin', label: 'Reference #', kind: 'identifier' },
    { key: 'year', label: 'Year', kind: 'number', marketplaceFilter: 'year' },
    { key: 'make', label: 'Brand', kind: 'text', marketplaceFilter: 'brand' },
    { key: 'model', label: 'Model', kind: 'text', marketplaceFilter: 'model' },
    { key: 'trim', label: 'Case size', kind: 'text' },
    { key: 'priceCents', label: 'Price', kind: 'currency', marketplaceFilter: 'price' },
    { key: 'condition', label: 'Condition', kind: 'text', marketplaceFilter: 'condition' },
  ],
  lifecycle: { active: 'In stock', sold: 'Sold', removed: 'Removed' },
  readiness: { ...genericReadiness },
  performance: { movementLabel: 'Sales pace', benchmarksLabel: 'Sales comparison' },
  formatters: watchesFormatters,
  marketplace: buildMarketplaceMeta('WATCHES', 'Watches', {
    consumerEnabled: false,
    tagline: 'Browse watches from participating dealers',
  }),
  fulfillmentPolicy: {
    allowedModes: ['third_party_shipping', 'contact_seller'],
    defaultMode: 'third_party_shipping',
    methodLabel: 'Shipping available',
    timingLabel: 'Seller-provided timing',
    costLabel: 'Shipping may cost extra',
  },
};

/** @deprecated use watchesSchema */
export const schema = watchesSchema;
