import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { digitalArtCopy } from './copy.en.js';
import { digitalArtFormatters } from './formatters.js';

export const digitalArtSchema: CategorySchema = {
  id: 'DIGITAL_ART',
  status: 'active',
  lifecycleMode: 'digital_distribution',
  label: 'Digital Art',
  copy: digitalArtCopy,
  asset: {
    singular: 'artwork',
    plural: 'artworks',
    refLabel: 'Asset ID',
    idLabel: 'Edition #',
    titleLabel: 'Artwork',
    idFieldKey: '',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'Asset ID',  kind: 'identifier' },
    { key: 'editionId',   label: 'Edition #', kind: 'identifier',
      filterStorage: { storage: 'categoryPayload', payloadKey: 'editionId' } },
    { key: 'artist',      label: 'Artist',    kind: 'text', marketplaceFilter: 'brand',
      filterStorage: { storage: 'categoryPayload', payloadKey: 'artist' } },
    { key: 'title',       label: 'Title',     kind: 'text', marketplaceFilter: 'model',
      filterStorage: { storage: 'categoryPayload', payloadKey: 'title' } },
    { key: 'priceCents',  label: 'Price',     kind: 'currency', marketplaceFilter: 'price' },
  ],
  lifecycle: { active: 'Listed', sold: 'Sold', removed: 'Unlisted' },
  readiness: { ...genericReadiness },
  performance: { movementLabel: 'Sales pace', benchmarksLabel: 'Sales comparison' },
  formatters: digitalArtFormatters,
  marketplace: buildMarketplaceMeta('DIGITAL_ART', 'Digital Art', {
    consumerEnabled: false,
    tagline: 'Browse digital artworks from participating artists',
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

/** @deprecated use digitalArtSchema */
export const schema = digitalArtSchema;
