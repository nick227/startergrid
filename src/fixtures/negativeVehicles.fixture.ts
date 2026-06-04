import { mockVehicles } from './vehicles.fixture.js';
import type { VehiclePayload } from '../lib/types.js';

export const vehicleMissingCriticalFields: VehiclePayload[] = [
  {
    ...mockVehicles[0],
    vin: 'BADVIN###',
    stockNumber: 'BROKEN-1',
    priceCents: 95000,
    exteriorColor: '',
    media: []
  },
  {
    ...mockVehicles[1],
    stockNumber: 'BROKEN-2',
    make: '',
    model: '',
    mileage: undefined,
    media: [
      { url: '', kind: 'IMAGE', sortOrder: 1, width: 320, height: 240, mimeType: 'image/jpeg' }
    ]
  }
];
