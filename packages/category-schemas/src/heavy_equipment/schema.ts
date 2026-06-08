import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { heavyEquipmentCopy } from './copy.en.js';
import { heavyEquipmentFormatters } from './formatters.js';

export const heavyEquipmentSchema: CategorySchema = {
  id: 'HEAVY_EQUIPMENT',
  status: 'placeholder',
  lifecycleMode: 'physical_inventory',
  label: 'Heavy equipment',
  copy: heavyEquipmentCopy,
  asset: {
    singular: 'machine',
    plural: 'machines',
    refLabel: 'Stock #',
    idLabel: 'Serial #',
    titleLabel: 'Machine',
    idFieldKey: 'vin',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'Stock #', kind: 'identifier' },
    { key: 'vin', label: 'Serial #', kind: 'identifier' },
    { key: 'year', label: 'Year', kind: 'number', marketplaceFilter: 'year' },
    { key: 'make', label: 'Manufacturer', kind: 'text', marketplaceFilter: 'brand' },
    { key: 'model', label: 'Model', kind: 'text', marketplaceFilter: 'model' },
    { key: 'trim', label: 'Configuration', kind: 'text' },
    { key: 'mileage', label: 'Hours', kind: 'number', marketplaceFilter: 'usage' },
    { key: 'priceCents', label: 'Price', kind: 'currency', marketplaceFilter: 'price' },
    { key: 'condition', label: 'Condition', kind: 'text', marketplaceFilter: 'condition' },
  ],
  lifecycle: { active: 'Available', sold: 'Sold', removed: 'Removed' },
  readiness: { ...genericReadiness },
  performance: { movementLabel: 'Sales pace', benchmarksLabel: 'Market comparison' },
  formatters: heavyEquipmentFormatters,
  marketplace: buildMarketplaceMeta('HEAVY_EQUIPMENT', 'Heavy equipment', {
    consumerEnabled: false,
    tagline: 'Browse heavy equipment from participating dealers',
  }),
  fulfillmentPolicy: {
    allowedModes: ['pickup', 'local_delivery', 'contact_seller'],
    defaultMode: 'contact_seller',
    methodLabel: 'Pickup or arranged transport',
    timingLabel: 'By arrangement',
    costLabel: 'Transport may cost extra',
    buyerMessage: 'Contact seller about pickup or transport arrangements.',
  },
};

/** @deprecated use heavyEquipmentSchema */
export const schema = heavyEquipmentSchema;
