import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { furnitureCopy } from './copy.en.js';
import { furnitureFormatters } from './formatters.js';

export const furnitureSchema: CategorySchema = {
  id: 'FURNITURE',
  status: 'placeholder',
  lifecycleMode: 'physical_inventory',
  label: 'Furniture',
  copy: furnitureCopy,
  asset: {
    singular: 'piece',
    plural: 'pieces',
    refLabel: 'SKU',
    idLabel: 'SKU',
    titleLabel: 'Piece',
    idFieldKey: 'stockNumber',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'SKU', kind: 'identifier' },
    { key: 'make', label: 'Brand', kind: 'text', marketplaceFilter: 'brand' },
    { key: 'model', label: 'Piece', kind: 'text', marketplaceFilter: 'model' },
    { key: 'exteriorColor', label: 'Finish', kind: 'text' },
    { key: 'priceCents', label: 'Price', kind: 'currency', marketplaceFilter: 'price' },
    { key: 'condition', label: 'Condition', kind: 'text', marketplaceFilter: 'condition' },
  ],
  lifecycle: { active: 'Available', sold: 'Sold', removed: 'Removed' },
  readiness: { ...genericReadiness },
  performance: { movementLabel: 'Sales pace', benchmarksLabel: 'Sales comparison' },
  formatters: furnitureFormatters,
  marketplace: buildMarketplaceMeta('FURNITURE', 'Furniture', {
    consumerEnabled: false,
    tagline: 'Browse furniture from participating sellers',
  }),
  fulfillmentPolicy: {
    allowedModes: ['pickup', 'local_delivery', 'contact_seller'],
    defaultMode: 'contact_seller',
    methodLabel: 'Pickup or local delivery',
    timingLabel: 'By arrangement',
    costLabel: 'Delivery may cost extra',
    buyerMessage: 'Contact seller about pickup or local delivery availability.',
  },
};

/** @deprecated use furnitureSchema */
export const schema = furnitureSchema;
