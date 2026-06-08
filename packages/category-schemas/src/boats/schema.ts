import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericLifecycle, genericReadiness } from '../generic/copy.en.js';
import { boatsCopy } from './copy.en.js';
import { boatsFormatters } from './formatters.js';

export const boatsSchema: CategorySchema = {
  id: 'BOATS',
  status: 'active',
  lifecycleMode: 'physical_inventory',
  label: 'Boats',
  copy: boatsCopy,
  asset: {
    singular: 'boat',
    plural: 'boats',
    refLabel: 'Stock #',
    idLabel: 'HIN',
    titleLabel: 'Boat',
    idFieldKey: 'vin',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'Stock #', kind: 'identifier' },
    { key: 'vin', label: 'HIN', kind: 'identifier' },
    { key: 'year', label: 'Year', kind: 'number', marketplaceFilter: 'year' },
    { key: 'make', label: 'Make', kind: 'text', marketplaceFilter: 'brand' },
    { key: 'model', label: 'Model', kind: 'text', marketplaceFilter: 'model' },
    { key: 'mileage', label: 'Hours', kind: 'number', marketplaceFilter: 'usage' },
    { key: 'priceCents', label: 'Price', kind: 'currency', marketplaceFilter: 'price' },
    { key: 'condition', label: 'Condition', kind: 'text', marketplaceFilter: 'condition' },
    {
      key: 'vesselType',
      label: 'Vessel type',
      kind: 'enum',
      filterStorage: { storage: 'categoryPayload', payloadKey: 'vesselType' },
      options: [
        { value: 'Center Console', label: 'Center console' },
        { value: 'Express Cruiser', label: 'Express cruiser' },
        { value: 'Jet Boat', label: 'Jet boat' },
        { value: 'Bowrider', label: 'Bowrider' },
        { value: 'Dual Console', label: 'Dual console' },
        { value: 'Pontoon', label: 'Pontoon' },
        { value: 'Sailboat', label: 'Sailboat' },
      ],
    },
  ],
  lifecycle: { ...genericLifecycle },
  readiness: { ...genericReadiness },
  performance: {
    movementLabel: 'Turnover pace',
    benchmarksLabel: 'Turnover comparison',
  },
  formatters: boatsFormatters,
  marketplace: buildMarketplaceMeta('BOATS', 'Boats', {
    tagline: 'Browse boats and watercraft from participating dealers',
  }),
  fulfillmentPolicy: {
    allowedModes: ['pickup', 'seller_delivery', 'contact_seller'],
    defaultMode: 'contact_seller',
    methodLabel: 'Pickup or arranged transport',
    timingLabel: 'By arrangement',
    costLabel: 'Transport may cost extra',
    buyerMessage: 'Ask the seller about pickup, transport, or delivery options.',
  },
};

/** @deprecated use boatsSchema */
export const schema = boatsSchema;
