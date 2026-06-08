import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { commercialPropertyCopy } from './copy.en.js';
import { commercialPropertyFormatters } from './formatters.js';

export const commercialPropertySchema: CategorySchema = {
  id: 'COMMERCIAL_PROPERTY',
  status: 'placeholder',
  lifecycleMode: 'physical_inventory',
  label: 'Commercial property',
  copy: commercialPropertyCopy,
  asset: {
    singular: 'property',
    plural: 'properties',
    refLabel: 'Listing #',
    idLabel: 'Property ID',
    titleLabel: 'Property',
    idFieldKey: 'vin',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'Listing #', kind: 'identifier' },
    { key: 'vin', label: 'Property ID', kind: 'identifier' },
    { key: 'year', label: 'Year built', kind: 'number', marketplaceFilter: 'year' },
    { key: 'make', label: 'Broker', kind: 'text', marketplaceFilter: 'seller' },
    { key: 'model', label: 'Property', kind: 'text', marketplaceFilter: 'model' },
    { key: 'trim', label: 'Type', kind: 'text' },
    { key: 'priceCents', label: 'List price', kind: 'currency', marketplaceFilter: 'price' },
  ],
  lifecycle: { active: 'For sale', sold: 'Sold', removed: 'Delisted' },
  readiness: { ...genericReadiness },
  performance: { movementLabel: 'Deal pace', benchmarksLabel: 'Market comparison' },
  formatters: commercialPropertyFormatters,
  marketplace: buildMarketplaceMeta('COMMERCIAL_PROPERTY', 'Commercial property', {
    consumerEnabled: false,
    tagline: 'Browse commercial properties from participating brokers',
  }),
  fulfillmentPolicy: {
    allowedModes: ['contact_seller'],
    defaultMode: 'contact_seller',
    methodLabel: 'Contact seller',
    timingLabel: 'Tour or availability by arrangement',
    buyerMessage: 'Contact seller about access, tours, or next steps.',
  },
};

/** @deprecated use commercialPropertySchema */
export const schema = commercialPropertySchema;
