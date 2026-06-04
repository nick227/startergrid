import type { VehiclePayload } from '../lib/types.js';

export const mockVehicles: VehiclePayload[] = [
  {
    vin: '1HGCV1F30JA000001',
    stockNumber: 'LS-1001',
    year: 2018,
    make: 'Honda',
    model: 'Accord',
    trim: 'EX',
    mileage: 68250,
    priceCents: 1899500,
    condition: 'USED',
    exteriorColor: 'Silver',
    interiorColor: 'Black',
    bodyStyle: 'Sedan',
    drivetrain: 'FWD',
    fuelType: 'Gasoline',
    transmission: 'Automatic',
    options: ['Apple CarPlay', 'Backup Camera', 'Heated Seats'],
    starCore: {
      Vehicle: {
        VIN: '1HGCV1F30JA000001',
        ModelYear: 2018,
        MakeString: 'Honda',
        ModelString: 'Accord',
        TrimString: 'EX'
      }
    },
    media: [
      { url: 'https://images.example.com/vehicles/LS-1001/front.jpg', kind: 'IMAGE', sortOrder: 1, width: 1200, height: 900, mimeType: 'image/jpeg' },
      { url: 'https://images.example.com/vehicles/LS-1001/rear.jpg', kind: 'IMAGE', sortOrder: 2, width: 1200, height: 900, mimeType: 'image/jpeg' },
      { url: 'https://images.example.com/vehicles/LS-1001/interior.jpg', kind: 'IMAGE', sortOrder: 3, width: 1200, height: 900, mimeType: 'image/jpeg' }
    ]
  },
  {
    vin: '5YJ3E1EA7KF000002',
    stockNumber: 'LS-1002',
    year: 2019,
    make: 'Tesla',
    model: 'Model 3',
    trim: 'Standard Range Plus',
    mileage: 40100,
    priceCents: 2499500,
    condition: 'USED',
    exteriorColor: 'White',
    interiorColor: 'Black',
    bodyStyle: 'Sedan',
    drivetrain: 'RWD',
    fuelType: 'Electric',
    transmission: 'Automatic',
    options: ['Navigation', 'Backup Camera', 'Panoramic Roof'],
    starCore: {
      Vehicle: {
        VIN: '5YJ3E1EA7KF000002',
        ModelYear: 2019,
        MakeString: 'Tesla',
        ModelString: 'Model 3',
        TrimString: 'Standard Range Plus'
      }
    },
    media: [
      { url: 'https://images.example.com/vehicles/LS-1002/front.jpg', kind: 'IMAGE', sortOrder: 1, width: 1200, height: 900, mimeType: 'image/jpeg' },
      { url: 'https://images.example.com/vehicles/LS-1002/rear.jpg', kind: 'IMAGE', sortOrder: 2, width: 1200, height: 900, mimeType: 'image/jpeg' },
      { url: 'https://images.example.com/vehicles/LS-1002/interior.jpg', kind: 'IMAGE', sortOrder: 3, width: 1200, height: 900, mimeType: 'image/jpeg' }
    ]
  }
];
