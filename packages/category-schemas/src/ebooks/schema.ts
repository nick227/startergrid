import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { ebooksCopy } from './copy.en.js';
import { ebooksFormatters } from './formatters.js';

export const ebooksSchema: CategorySchema = {
  id: 'EBOOKS',
  status: 'placeholder',
  lifecycleMode: 'digital_distribution',
  label: 'E-books',
  copy: ebooksCopy,
  asset: {
    singular: 'ebook',
    plural: 'ebooks',
    refLabel: 'ASIN',
    idLabel: 'ISBN',
    titleLabel: 'Ebook',
    idFieldKey: 'vin',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'ASIN',         kind: 'identifier' },
    { key: 'vin',         label: 'ISBN',         kind: 'identifier' },
    { key: 'year',        label: 'Pub. Year',    kind: 'number' },
    { key: 'make',        label: 'Author',       kind: 'text' },
    { key: 'model',       label: 'Title',        kind: 'text' },
    { key: 'trim',        label: 'Edition',      kind: 'text' },
    { key: 'priceCents',  label: 'Price',        kind: 'currency' },
  ],
  lifecycle: { active: 'Published', sold: 'Sold', removed: 'Delisted' },
  readiness: { ...genericReadiness },
  performance: { movementLabel: 'Sales pace', benchmarksLabel: 'Sales comparison' },
  formatters: ebooksFormatters,
  marketplace: buildMarketplaceMeta('EBOOKS', 'E-books', {
    consumerEnabled: false,
    tagline: 'Browse digital titles from participating publishers',
  }),
};

/** @deprecated use ebooksSchema */
export const schema = ebooksSchema;
