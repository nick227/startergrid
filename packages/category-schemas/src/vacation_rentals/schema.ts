import type { CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import { genericChannel, genericReadiness } from '../generic/copy.en.js';
import { vacationRentalsCopy } from './copy.en.js';
import { vacationRentalsFormatters } from './formatters.js';

export const vacationRentalsSchema: CategorySchema = {
  id: 'VACATION_RENTALS',
  status: 'placeholder',
  lifecycleMode: 'physical_inventory',
  label: 'Vacation rentals',
  copy: vacationRentalsCopy,
  asset: {
    singular: 'rental',
    plural: 'rentals',
    refLabel: 'Listing #',
    idLabel: 'Listing #',
    titleLabel: 'Property',
    idFieldKey: 'stockNumber',
  },
  channel: { ...genericChannel },
  fields: [
    { key: 'stockNumber', label: 'Listing #', kind: 'identifier' },
    { key: 'make', label: 'Host', kind: 'text', marketplaceFilter: 'seller' },
    { key: 'model', label: 'Property', kind: 'text', marketplaceFilter: 'model' },
    { key: 'trim', label: 'Location', kind: 'text' },
    { key: 'priceCents', label: 'Nightly rate', kind: 'currency', marketplaceFilter: 'price' },
  ],
  lifecycle: { active: 'Available', sold: 'Booked', removed: 'Delisted' },
  readiness: { ...genericReadiness },
  performance: { movementLabel: 'Booking pace', benchmarksLabel: 'Booking comparison' },
  formatters: vacationRentalsFormatters,
  marketplace: buildMarketplaceMeta('VACATION_RENTALS', 'Vacation rentals', {
    consumerEnabled: false,
    tagline: 'Browse vacation rentals from participating hosts',
  }),
  fulfillmentPolicy: {
    allowedModes: ['contact_seller'],
    defaultMode: 'contact_seller',
    methodLabel: 'Contact seller',
    timingLabel: 'Tour or availability by arrangement',
    buyerMessage: 'Contact seller about access, tours, or next steps.',
  },
};

/** @deprecated use vacationRentalsSchema */
export const schema = vacationRentalsSchema;
