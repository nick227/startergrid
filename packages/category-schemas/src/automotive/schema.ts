import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { automotiveCopy } from './copy.en.js';
import { automotiveFormatters } from './formatters.js';

export const automotiveSchema: CategorySchema = {
  id: 'AUTOMOTIVE',
  status: 'active',
  lifecycleMode: 'physical_inventory',
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
    { key: 'year', label: 'Year', kind: 'number', marketplaceFilter: 'year' },
    { key: 'make', label: 'Make', kind: 'text', marketplaceFilter: 'brand' },
    { key: 'model', label: 'Model', kind: 'text', marketplaceFilter: 'model' },
    { key: 'mileage', label: 'Mileage', kind: 'number', marketplaceFilter: 'usage' },
    { key: 'priceCents', label: 'Price', kind: 'currency', marketplaceFilter: 'price' },
    { key: 'trim', label: 'Trim', kind: 'text' },
    { key: 'condition', label: 'Condition', kind: 'text', marketplaceFilter: 'condition' },
    { key: 'exteriorColor', label: 'Exterior Color', kind: 'text' },
    { key: 'interiorColor', label: 'Interior Color', kind: 'text' },
    { key: 'bodyStyle', label: 'Body Style', kind: 'text' },
    { key: 'drivetrain', label: 'Drivetrain', kind: 'text' },
    { key: 'fuelType', label: 'Fuel Type', kind: 'text' },
    { key: 'transmission', label: 'Transmission', kind: 'text' },
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
