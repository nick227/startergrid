import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericLifecycle, genericReadiness } from '../generic/copy.en.js';
import { trailersPowersportsRvCopy } from './copy.en.js';
import { trailersPowersportsRvFormatters } from './formatters.js';

export const trailersPowersportsRvSchema: CategorySchema = {
  id: 'TRAILERS_POWERSPORTS_RV',
  status: 'active',
  lifecycleMode: 'physical_inventory',
  label: 'Trailers, powersports & RV',
  copy: trailersPowersportsRvCopy,
  asset: {
    singular: 'unit',
    plural: 'units',
    refLabel: 'Stock #',
    idLabel: 'Serial #',
    titleLabel: 'Unit',
    idFieldKey: 'vin',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'Stock #', kind: 'identifier' },
    { key: 'vin', label: 'Serial #', kind: 'identifier' },
    { key: 'year', label: 'Year', kind: 'number', marketplaceFilter: 'year' },
    { key: 'make', label: 'Make', kind: 'text', marketplaceFilter: 'brand' },
    { key: 'model', label: 'Model', kind: 'text', marketplaceFilter: 'model' },
    { key: 'mileage', label: 'Miles / Hours', kind: 'number', marketplaceFilter: 'usage' },
    { key: 'priceCents', label: 'Price', kind: 'currency', marketplaceFilter: 'price' },
    { key: 'condition', label: 'Condition', kind: 'text', marketplaceFilter: 'condition' },
  ],
  lifecycle: { ...genericLifecycle },
  readiness: { ...genericReadiness },
  performance: {
    movementLabel: 'Turnover pace',
    benchmarksLabel: 'Turnover comparison',
  },
  formatters: trailersPowersportsRvFormatters,
  marketplace: buildMarketplaceMeta(
    'TRAILERS_POWERSPORTS_RV',
    'Trailers, powersports & RV',
    {
      tagline: 'Browse RVs, trailers, ATVs, and powersports from participating dealers',
    },
  ),
  fulfillmentPolicy: {
    allowedModes: ['pickup', 'seller_delivery', 'contact_seller'],
    defaultMode: 'contact_seller',
    methodLabel: 'Pickup or arranged transport',
    timingLabel: 'By arrangement',
    costLabel: 'Transport may cost extra',
    buyerMessage: 'Ask the seller about pickup, transport, or delivery options.',
  },
};

/** @deprecated use trailersPowersportsRvSchema */
export const schema = trailersPowersportsRvSchema;
