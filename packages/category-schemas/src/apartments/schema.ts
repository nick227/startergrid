import { createPlaceholderSchema } from '../generic/schema.js';

export const schema = createPlaceholderSchema('APARTMENTS', 'Apartments', {}, {
  fulfillmentPolicy: {
    allowedModes: ['contact_seller'],
    defaultMode: 'contact_seller',
    methodLabel: 'Contact seller',
    timingLabel: 'Tour or availability by arrangement',
    buyerMessage: 'Contact seller about access, tours, or next steps.',
  },
});
