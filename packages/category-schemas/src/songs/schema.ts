import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { songsCopy } from './copy.en.js';
import { songsFormatters } from './formatters.js';

export const songsSchema: CategorySchema = {
  id: 'SONGS',
  status: 'placeholder',
  lifecycleMode: 'digital_distribution',
  label: 'Music',
  copy: songsCopy,
  asset: {
    singular: 'release',
    plural: 'releases',
    refLabel: 'UPC',
    idLabel: 'ISRC',
    titleLabel: 'Release',
    idFieldKey: 'vin',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'UPC',          kind: 'identifier' },
    { key: 'vin',         label: 'ISRC',         kind: 'identifier' },
    { key: 'year',        label: 'Release Year', kind: 'number' },
    { key: 'make',        label: 'Artist',       kind: 'text' },
    { key: 'model',       label: 'Title',        kind: 'text' },
    { key: 'trim',        label: 'Format',       kind: 'text' },
    { key: 'priceCents',  label: 'Price',        kind: 'currency' },
  ],
  lifecycle: { active: 'Live', sold: 'Licensed', removed: 'Delisted' },
  readiness: { ...genericReadiness },
  performance: { movementLabel: 'Distribution pace', benchmarksLabel: 'Distribution comparison' },
  formatters: songsFormatters,
  marketplace: buildMarketplaceMeta('SONGS', 'Music', {
    consumerEnabled: false,
    tagline: 'Browse music releases from participating artists',
  }),
  fulfillmentPolicy: {
    allowedModes: ['digital'],
    defaultMode: 'digital',
    methodLabel: 'Online delivery',
    timingLabel: 'Online access',
    costLabel: 'No shipping required',
    buyerMessage: 'Delivered online or handled through the seller/platform flow.',
  },
};

/** @deprecated use songsSchema */
export const schema = songsSchema;
