import { mockDealership } from './dealership.fixture.js';
import type { DealershipPayload } from '../../lib/types.js';

export const dealershipMissingCriticalFields: DealershipPayload = {
  ...mockDealership,
  dealerLicense: '',
  websiteUrl: 'http://not-secure-lot.example.com',
  primaryContact: {
    ...mockDealership.primaryContact,
    email: '',
    phone: ''
  },
  rooftopAddress: {
    ...mockDealership.rooftopAddress,
    postalCode: ''
  },
  inventorySize: 0
};
