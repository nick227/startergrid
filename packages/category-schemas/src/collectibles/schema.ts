import { createPlaceholderSchema } from '../generic/schema.js';

export const schema = createPlaceholderSchema('COLLECTIBLES', 'Collectibles', {}, {
  fulfillmentPolicy: {
    allowedModes: ['third_party_shipping', 'contact_seller'],
    defaultMode: 'third_party_shipping',
    methodLabel: 'Shipping available',
    timingLabel: 'Seller-provided timing',
    costLabel: 'Shipping may cost extra',
  },
});
