import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { pawnCopy } from './copy.en.js';
import { pawnFormatters } from './formatters.js';

export const pawnSchema: CategorySchema = {
  id: 'PAWN',
  status: 'placeholder',
  lifecycleMode: 'physical_inventory',
  label: 'Pawn & Resale',
  copy: pawnCopy,
  asset: {
    singular: 'item',
    plural: 'items',
    refLabel: 'Ticket #',
    idLabel: 'Serial #',
    titleLabel: 'Item',
    idFieldKey: 'vin',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'Ticket #',    kind: 'identifier' },
    { key: 'vin',         label: 'Serial #',    kind: 'identifier' },
    { key: 'make',        label: 'Brand',       kind: 'text' },
    { key: 'model',       label: 'Description', kind: 'text' },
    { key: 'priceCents',  label: 'Asking Price', kind: 'currency' },
    { key: 'condition',   label: 'Condition',   kind: 'text' },
  ],
  lifecycle: { active: 'Available', sold: 'Sold', removed: 'Removed' },
  readiness: { ...genericReadiness },
  performance: { movementLabel: 'Sales pace', benchmarksLabel: 'Sales comparison' },
  formatters: pawnFormatters,
  marketplace: buildMarketplaceMeta('PAWN', 'Pawn & Resale', {
    consumerEnabled: false,
    tagline: 'Browse pre-owned items from participating shops',
  }),
  fulfillmentPolicy: {
    allowedModes: ['pickup', 'contact_seller'],
    defaultMode: 'contact_seller',
    methodLabel: 'Pickup or contact seller',
    timingLabel: 'By arrangement',
    buyerMessage: 'Contact seller about availability and pickup.',
  },
};

/** @deprecated use pawnSchema */
export const schema = pawnSchema;
