import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { homesCopy } from './copy.en.js';
import { homesFormatters } from './formatters.js';

export const homesSchema: CategorySchema = {
  id: 'HOMES',
  status: 'placeholder',
  lifecycleMode: 'physical_inventory',
  label: 'Homes',
  copy: homesCopy,
  asset: {
    singular: 'home',
    plural: 'homes',
    refLabel: 'Listing #',
    idLabel: 'MLS #',
    titleLabel: 'Home',
    idFieldKey: 'vin',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'Listing #', kind: 'identifier' },
    { key: 'vin', label: 'MLS #', kind: 'identifier' },
    { key: 'year', label: 'Year built', kind: 'number', marketplaceFilter: 'year' },
    { key: 'make', label: 'Broker', kind: 'text', marketplaceFilter: 'seller' },
    { key: 'model', label: 'Address / name', kind: 'text', marketplaceFilter: 'model' },
    { key: 'trim', label: 'Layout', kind: 'text' },
    { key: 'priceCents', label: 'List price', kind: 'currency', marketplaceFilter: 'price' },
    { key: 'condition', label: 'Condition', kind: 'text', marketplaceFilter: 'condition' },
  ],
  lifecycle: { active: 'For sale', sold: 'Sold', removed: 'Delisted' },
  readiness: { ...genericReadiness },
  performance: { movementLabel: 'Sales pace', benchmarksLabel: 'Market comparison' },
  formatters: homesFormatters,
  marketplace: buildMarketplaceMeta('HOMES', 'Homes', {
    consumerEnabled: false,
    tagline: 'Browse homes from participating brokers',
  }),
  fulfillmentPolicy: {
    allowedModes: ['contact_seller'],
    defaultMode: 'contact_seller',
    methodLabel: 'Contact seller',
    timingLabel: 'Tour or availability by arrangement',
    buyerMessage: 'Contact seller about access, tours, or next steps.',
  },
};

/** @deprecated use homesSchema */
export const schema = homesSchema;
