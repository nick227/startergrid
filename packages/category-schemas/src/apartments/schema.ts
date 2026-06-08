import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { apartmentsCopy } from './copy.en.js';
import { apartmentsFormatters } from './formatters.js';

export const apartmentsSchema: CategorySchema = {
  id: 'APARTMENTS',
  status: 'placeholder',
  lifecycleMode: 'physical_inventory',
  label: 'Apartments',
  copy: apartmentsCopy,
  asset: {
    singular: 'unit',
    plural: 'units',
    refLabel: 'Unit #',
    idLabel: 'MLS #',
    titleLabel: 'Unit',
    idFieldKey: 'vin',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'Unit #', kind: 'identifier' },
    { key: 'vin', label: 'MLS #', kind: 'identifier' },
    { key: 'make', label: 'Property manager', kind: 'text', marketplaceFilter: 'seller' },
    { key: 'model', label: 'Property', kind: 'text', marketplaceFilter: 'model' },
    { key: 'trim', label: 'Layout', kind: 'text' },
    { key: 'priceCents', label: 'Monthly rent', kind: 'currency', marketplaceFilter: 'price' },
  ],
  lifecycle: { active: 'Available', sold: 'Leased', removed: 'Delisted' },
  readiness: { ...genericReadiness },
  performance: { movementLabel: 'Lease pace', benchmarksLabel: 'Lease comparison' },
  formatters: apartmentsFormatters,
  marketplace: buildMarketplaceMeta('APARTMENTS', 'Apartments', {
    consumerEnabled: false,
    tagline: 'Browse apartment listings from participating managers',
  }),
  fulfillmentPolicy: {
    allowedModes: ['contact_seller'],
    defaultMode: 'contact_seller',
    methodLabel: 'Contact seller',
    timingLabel: 'Tour or availability by arrangement',
    buyerMessage: 'Contact seller about access, tours, or next steps.',
  },
};

/** @deprecated use apartmentsSchema */
export const schema = apartmentsSchema;
