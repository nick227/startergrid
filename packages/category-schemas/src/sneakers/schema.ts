import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import {
  genericAsset,
  genericChannel,
  genericCopy,
  genericLifecycle,
  genericPerformance,
  genericReadiness,
} from '../generic/copy.en.js';
import { genericFormatters } from '../generic/formatters.js';

export const sneakersSchema: CategorySchema = {
  id: 'SNEAKERS',
  status: 'placeholder',
  lifecycleMode: 'physical_inventory',
  label: 'Sneakers',
  copy: genericCopy,
  asset: { ...genericAsset, singular: 'sneaker', plural: 'sneakers', titleLabel: 'Sneaker' },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'SKU', kind: 'identifier' },
    { key: 'vin', label: 'Style code', kind: 'identifier' },
    { key: 'make', label: 'Brand', kind: 'text', marketplaceFilter: 'brand' },
    { key: 'model', label: 'Style', kind: 'text', marketplaceFilter: 'model' },
    { key: 'trim', label: 'Size', kind: 'text' },
    { key: 'priceCents', label: 'Price', kind: 'currency', marketplaceFilter: 'price' },
    { key: 'condition', label: 'Condition', kind: 'text', marketplaceFilter: 'condition' },
  ],
  lifecycle: { ...genericLifecycle },
  readiness: { ...genericReadiness },
  performance: { ...genericPerformance },
  formatters: genericFormatters,
  marketplace: buildMarketplaceMeta('SNEAKERS', 'Sneakers', {
    consumerEnabled: false,
    tagline: 'Browse sneakers from participating sellers',
  }),
  fulfillmentPolicy: {
    allowedModes: ['third_party_shipping', 'contact_seller'],
    defaultMode: 'third_party_shipping',
    methodLabel: 'Shipping available',
    timingLabel: 'Seller-provided timing',
    costLabel: 'Shipping may cost extra',
  },
};

/** @deprecated use sneakersSchema */
export const schema = sneakersSchema;
