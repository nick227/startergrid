import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { videoCopy } from './copy.en.js';
import { videoFormatters } from './formatters.js';

export const videoDistributionSchema: CategorySchema = {
  id: 'VIDEO_DISTRIBUTION',
  status: 'placeholder',
  lifecycleMode: 'digital_distribution',
  label: 'Video',
  copy: videoCopy,
  asset: {
    singular: 'video',
    plural: 'videos',
    refLabel: 'Video ID',
    idLabel: 'Internal ID',
    titleLabel: 'Video',
    idFieldKey: '',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'Video ID',     kind: 'identifier' },
    { key: 'year',        label: 'Publish Year', kind: 'number' },
    { key: 'make',        label: 'Creator',      kind: 'text' },
    { key: 'model',       label: 'Title',        kind: 'text' },
    { key: 'priceCents',  label: 'Price',        kind: 'currency' },
  ],
  lifecycle: { active: 'Published', sold: 'Licensed', removed: 'Delisted' },
  readiness: { ...genericReadiness },
  performance: { movementLabel: 'View pace', benchmarksLabel: 'View comparison' },
  formatters: videoFormatters,
  marketplace: buildMarketplaceMeta('VIDEO_DISTRIBUTION', 'Video', {
    consumerEnabled: false,
    tagline: 'Browse videos from participating creators',
  }),
};

/** @deprecated use videoDistributionSchema */
export const schema = videoDistributionSchema;
