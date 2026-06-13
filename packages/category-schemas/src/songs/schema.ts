import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { songsCopy } from './copy.en.js';
import { songsFormatters } from './formatters.js';

export const songsSchema: CategorySchema = {
  id: 'SONGS',
  status: 'active',
  lifecycleMode: 'digital_distribution',
  label: 'Music',
  copy: songsCopy,
  asset: {
    singular: 'release',
    plural: 'releases',
    refLabel: 'UPC',
    idLabel: 'ISRC',
    titleLabel: 'Release',
    idFieldKey: '',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'UPC',    kind: 'identifier' },
    { key: 'isrc',        label: 'ISRC',   kind: 'identifier',
      filterStorage: { storage: 'categoryPayload', payloadKey: 'isrc' } },
    { key: 'artist',      label: 'Artist', kind: 'text', marketplaceFilter: 'brand',
      filterStorage: { storage: 'categoryPayload', payloadKey: 'artist' } },
    { key: 'title',       label: 'Title',  kind: 'text', marketplaceFilter: 'model',
      filterStorage: { storage: 'categoryPayload', payloadKey: 'title' } },
    { key: 'format',      label: 'Format', kind: 'text',
      filterStorage: { storage: 'categoryPayload', payloadKey: 'format' } },
    { key: 'priceCents',  label: 'Price',  kind: 'currency', marketplaceFilter: 'price' },
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
