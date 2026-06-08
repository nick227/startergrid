import { createPlaceholderSchema } from '../generic/schema.js';

export const schema = createPlaceholderSchema('FURNITURE', 'Furniture', {}, {
  fulfillmentPolicy: {
    allowedModes: ['pickup', 'local_delivery', 'contact_seller'],
    defaultMode: 'contact_seller',
    methodLabel: 'Pickup or local delivery',
    timingLabel: 'By arrangement',
    costLabel: 'Delivery may cost extra',
    buyerMessage: 'Contact seller about pickup or local delivery availability.',
  },
});
