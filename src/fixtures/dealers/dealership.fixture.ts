import type { DealershipPayload } from '../../lib/types.js';

export const mockDealership: DealershipPayload = {
  legalName: 'Lone Star Budget Auto LLC',
  dbaName: 'Lone Star Budget Auto',
  dealerLicense: 'TX-MOCK-48291',
  rooftopAddress: {
    street: '1400 Mockingbird Lane',
    city: 'Austin',
    state: 'TX',
    postalCode: '78701',
    country: 'US'
  },
  rooftopLat: 30.2672,
  rooftopLng: -97.7431,
  websiteUrl: 'https://lonestar-budget-auto.example.com',
  primaryContact: {
    name: 'Maria Sanchez',
    title: 'Owner',
    email: 'maria@lonestar-budget-auto.example.com',
    phone: '+15125550118'
  },
  inventorySize: 37,
  desiredChannels: [
    'google-vehicle-ads',
    'meta-automotive-ads',
    'tiktok-automotive-ads',
    'cargurus-dealer',
    'autotrader-cox',
    'cars-com',
    'truecar-dealer-network',
    'adf-xml-lead-routing'
  ],
  documents: {
    dealerLicensePdfUrl: 'https://docs.example.com/mock/dealer-license.pdf',
    w9PdfUrl: 'https://docs.example.com/mock/w9.pdf'
  }
};
