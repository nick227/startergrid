import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { digitalArtCopy } from './copy.en.js';
import { digitalArtFormatters } from './formatters.js';

export const digitalArtSchema: CategorySchema = {
  id: 'DIGITAL_ART',
  status: 'placeholder',
  lifecycleMode: 'digital_distribution',
  label: 'Digital Art',
  copy: digitalArtCopy,
  asset: {
    singular: 'artwork',
    plural: 'artworks',
    refLabel: 'Asset ID',
    idLabel: 'Edition #',
    titleLabel: 'Artwork',
    idFieldKey: 'vin',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'Asset ID',     kind: 'identifier' },
    { key: 'vin',         label: 'Edition #',    kind: 'identifier' },
    { key: 'year',        label: 'Created Year', kind: 'number' },
    { key: 'make',        label: 'Artist',       kind: 'text' },
    { key: 'model',       label: 'Title',        kind: 'text' },
    { key: 'trim',        label: 'Series',       kind: 'text' },
    { key: 'priceCents',  label: 'Price',        kind: 'currency' },
  ],
  lifecycle: { active: 'Listed', sold: 'Sold', removed: 'Unlisted' },
  readiness: { ...genericReadiness },
  performance: { movementLabel: 'Sales pace', benchmarksLabel: 'Sales comparison' },
  formatters: digitalArtFormatters,
  marketplace: buildMarketplaceMeta('DIGITAL_ART', 'Digital Art', {
    consumerEnabled: false,
    tagline: 'Browse digital artworks from participating artists',
  }),
};

/** @deprecated use digitalArtSchema */
export const schema = digitalArtSchema;
