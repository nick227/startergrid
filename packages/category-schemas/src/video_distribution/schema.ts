import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { videoCopy } from './copy.en.js';
import { videoFormatters } from './formatters.js';

export const videoDistributionSchema: CategorySchema = {
  id: 'VIDEO_DISTRIBUTION',
  status: 'active',
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
    { key: 'stockNumber', label: 'Video ID', kind: 'identifier' },
    { key: 'creator',     label: 'Creator',  kind: 'text', marketplaceFilter: 'brand',
      filterStorage: { storage: 'categoryPayload', payloadKey: 'creator' } },
    { key: 'title',       label: 'Title',    kind: 'text', marketplaceFilter: 'model',
      filterStorage: { storage: 'categoryPayload', payloadKey: 'title' } },
    { key: 'priceCents',  label: 'Price',    kind: 'currency', marketplaceFilter: 'price' },
  ],
  lifecycle: { active: 'Published', sold: 'Licensed', removed: 'Delisted' },
  readiness: { ...genericReadiness },
  performance: { movementLabel: 'View pace', benchmarksLabel: 'View comparison' },
  formatters: videoFormatters,
  marketplace: buildMarketplaceMeta('VIDEO_DISTRIBUTION', 'Video', {
    consumerEnabled: false,
    tagline: 'Browse videos from participating creators',
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

/** @deprecated use videoDistributionSchema */
export const schema = videoDistributionSchema;
