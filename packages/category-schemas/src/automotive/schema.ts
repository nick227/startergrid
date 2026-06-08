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
    {
      key: 'bodyStyle',
      label: 'Body style',
      kind: 'enum',
      options: [
        { value: 'Sedan', label: 'Sedan' },
        { value: 'SUV', label: 'SUV' },
        { value: 'Truck', label: 'Truck' },
        { value: 'Coupe', label: 'Coupe' },
        { value: 'Hatchback', label: 'Hatchback' },
        { value: 'Van', label: 'Van' },
        { value: 'Wagon', label: 'Wagon' },
        { value: 'Convertible', label: 'Convertible' },
      ],
    },
    {
      key: 'drivetrain',
      label: 'Drivetrain',
      kind: 'enum',
      options: [
        { value: 'FWD', label: 'FWD' },
        { value: 'RWD', label: 'RWD' },
        { value: 'AWD', label: 'AWD' },
        { value: '4WD', label: '4WD' },
      ],
    },
    {
      key: 'fuelType',
      label: 'Fuel type',
      kind: 'enum',
      options: [
        { value: 'Gasoline', label: 'Gasoline' },
        { value: 'Diesel', label: 'Diesel' },
        { value: 'Electric', label: 'Electric' },
        { value: 'Hybrid', label: 'Hybrid' },
        { value: 'Plug-in Hybrid', label: 'Plug-in hybrid' },
      ],
    },
    {
      key: 'transmission',
      label: 'Transmission',
      kind: 'enum',
      options: [
        { value: 'Automatic', label: 'Automatic' },
        { value: 'Manual', label: 'Manual' },
        { value: 'CVT', label: 'CVT' },
      ],
    },
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
  fulfillmentPolicy: {
    allowedModes: ['pickup', 'seller_delivery', 'contact_seller'],
    defaultMode: 'contact_seller',
    methodLabel: 'Pickup or arranged delivery',
    timingLabel: 'By arrangement',
    costLabel: 'Delivery may cost extra',
    buyerMessage: 'Ask the seller about pickup, transport, or delivery options.',
  },
};
