import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { ebooksCopy } from './copy.en.js';
import { ebooksFormatters } from './formatters.js';

export const ebooksSchema: CategorySchema = {
  id: 'EBOOKS',
  status: 'active',
  lifecycleMode: 'digital_distribution',
  label: 'E-books',
  copy: ebooksCopy,
  asset: {
    singular: 'ebook',
    plural: 'ebooks',
    refLabel: 'SKU',
    idLabel: 'ISBN',
    titleLabel: 'Ebook',
    idFieldKey: '',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'SKU', kind: 'identifier' },
    { key: 'isbn', label: 'ISBN', kind: 'identifier',
      filterStorage: { storage: 'categoryPayload', payloadKey: 'isbn' } },
    { key: 'author', label: 'Author', kind: 'text', marketplaceFilter: 'brand',
      filterStorage: { storage: 'categoryPayload', payloadKey: 'author' } },
    { key: 'title', label: 'Title', kind: 'text', marketplaceFilter: 'model',
      filterStorage: { storage: 'categoryPayload', payloadKey: 'title' } },
    { key: 'format', label: 'Format', kind: 'enum',
      options: [
        { value: 'epub', label: 'ePub' },
        { value: 'pdf', label: 'PDF' },
        { value: 'mobi', label: 'Mobi' },
        { value: 'audiobook', label: 'Audiobook' },
      ],
      filterStorage: { storage: 'categoryPayload', payloadKey: 'format' } },
    { key: 'publishYear', label: 'Pub. Year', kind: 'number', marketplaceFilter: 'year',
      filterStorage: { storage: 'categoryPayload', payloadKey: 'publishYear' } },
    { key: 'priceCents', label: 'Price', kind: 'currency', marketplaceFilter: 'price' },
  ],
  lifecycle: { active: 'Published', sold: 'Sold', removed: 'Delisted' },
  readiness: { ...genericReadiness },
  performance: { movementLabel: 'Sales pace', benchmarksLabel: 'Sales comparison' },
  formatters: ebooksFormatters,
  marketplace: buildMarketplaceMeta('EBOOKS', 'E-books', {
    consumerEnabled: true,
    tagline: 'Browse digital titles from participating publishers',
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

/** @deprecated use ebooksSchema */
export const schema = ebooksSchema;
