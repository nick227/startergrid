import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericLifecycle, genericReadiness } from '../generic/copy.en.js';
import { boatsCopy } from './copy.en.js';
import { boatsFormatters } from './formatters.js';

export const boatsSchema: CategorySchema = {
  id: 'BOATS',
  status: 'active',
  label: 'Boats',
  copy: boatsCopy,
  asset: {
    singular: 'boat',
    plural: 'boats',
    refLabel: 'Stock #',
    idLabel: 'HIN',
    titleLabel: 'Boat',
    idFieldKey: 'vin',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'Stock #', kind: 'identifier' },
    { key: 'vin', label: 'HIN', kind: 'identifier' },
    { key: 'year', label: 'Year', kind: 'number' },
    { key: 'make', label: 'Make', kind: 'text' },
    { key: 'model', label: 'Model', kind: 'text' },
    { key: 'mileage', label: 'Hours', kind: 'number' },
    { key: 'priceCents', label: 'Price', kind: 'currency' },
    { key: 'condition', label: 'Condition', kind: 'text' },
  ],
  lifecycle: { ...genericLifecycle },
  readiness: { ...genericReadiness },
  performance: {
    movementLabel: 'Turnover pace',
    benchmarksLabel: 'Turnover comparison',
  },
  formatters: boatsFormatters,
  marketplace: buildMarketplaceMeta('BOATS', 'Boats', {
    tagline: 'Browse boats and watercraft from participating dealers',
  }),
};

/** @deprecated use boatsSchema */
export const schema = boatsSchema;
