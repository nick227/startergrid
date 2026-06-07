import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { automotiveCopy } from './copy.en.js';
import { automotiveFormatters } from './formatters.js';

export const automotiveSchema: CategorySchema = {
  id: 'AUTOMOTIVE',
  status: 'active',
  label: 'Automotive',
  copy: automotiveCopy,
  asset: {
    singular: 'vehicle',
    plural: 'vehicles',
    refLabel: 'Stock #',
    idLabel: 'VIN',
    titleLabel: 'Vehicle',
    idFieldKey: 'vin',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'Stock #', kind: 'identifier' },
    { key: 'vin', label: 'VIN', kind: 'identifier' },
    { key: 'year', label: 'Year', kind: 'number' },
    { key: 'make', label: 'Make', kind: 'text' },
    { key: 'model', label: 'Model', kind: 'text' },
    { key: 'mileage', label: 'Mileage', kind: 'number' },
    { key: 'priceCents', label: 'Price', kind: 'currency' },
  ],
  lifecycle: {
    active: 'On the lot',
    sold: 'Sold',
    removed: 'Removed',
  },
  readiness: { ...genericReadiness },
  performance: {
    movementLabel: 'Sales pace',
    benchmarksLabel: 'Sales pace comparison',
  },
  formatters: automotiveFormatters,
  marketplace: buildMarketplaceMeta('AUTOMOTIVE', 'Automotive'),
};
