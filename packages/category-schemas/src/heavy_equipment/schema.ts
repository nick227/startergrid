import { createPlaceholderSchema } from '../generic/schema.js';

export const schema = createPlaceholderSchema('HEAVY_EQUIPMENT', 'Heavy equipment', {}, {
  fulfillmentPolicy: {
    allowedModes: ['pickup', 'local_delivery', 'contact_seller'],
    defaultMode: 'contact_seller',
    methodLabel: 'Pickup or arranged transport',
    timingLabel: 'By arrangement',
    costLabel: 'Transport may cost extra',
    buyerMessage: 'Contact seller about pickup or transport arrangements.',
  },
});
