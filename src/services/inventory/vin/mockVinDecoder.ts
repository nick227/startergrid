import type { VinDecoder, VinDecodeResult } from './vinDecoder.js';

// Deterministic fixture map keyed by uppercase VIN.
// These are real structurally-valid VINs used for local dev + tests.
const MOCK_FIXTURES: Record<string, Omit<VinDecodeResult, 'vin' | 'provider' | 'valid' | 'decoded' | 'warnings'>> = {
  // 2021 Toyota Camry LE
  '4T1C11AK5MU481526': {
    year: 2021, make: 'Toyota', model: 'Camry', trim: 'LE',
    bodyStyle: 'Sedan', fuelType: 'Gasoline', drivetrain: 'FWD',
    transmission: 'Automatic', engineDescription: '2.5L 4-Cylinder',
    manufacturer: 'Toyota Motor Corp',
    rawPayload: { Make: 'TOYOTA', Model: 'Camry', ModelYear: '2021', BodyClass: 'Sedan', FuelTypePrimary: 'Gasoline' },
  },
  // 2020 Ford F-150 XLT
  '1FTEW1EP3LFA12345': {
    year: 2020, make: 'Ford', model: 'F-150', trim: 'XLT',
    bodyStyle: 'Truck', fuelType: 'Gasoline', drivetrain: '4WD',
    transmission: 'Automatic', engineDescription: '5.0L V8',
    manufacturer: 'Ford Motor Company',
    rawPayload: { Make: 'FORD', Model: 'F-150', ModelYear: '2020', BodyClass: 'Pickup', FuelTypePrimary: 'Gasoline' },
  },
  // 2019 BMW 3 Series 330i
  'WBA5R1C50KAK12345': {
    year: 2019, make: 'BMW', model: '3 Series', trim: '330i',
    bodyStyle: 'Sedan', fuelType: 'Gasoline', drivetrain: 'RWD',
    transmission: 'Automatic', engineDescription: '2.0L Turbo 4-Cylinder',
    manufacturer: 'BMW',
    rawPayload: { Make: 'BMW', Model: '3 Series', ModelYear: '2019', BodyClass: 'Sedan' },
  },
  // 2022 Tesla Model 3 Long Range
  '5YJ3E1EA0NF123456': {
    year: 2022, make: 'Tesla', model: 'Model 3', trim: 'Long Range',
    bodyStyle: 'Sedan', fuelType: 'Electric', drivetrain: 'AWD',
    transmission: 'Automatic', engineDescription: 'Dual Motor Electric',
    manufacturer: 'Tesla, Inc.',
    rawPayload: { Make: 'TESLA', Model: 'Model 3', ModelYear: '2022', FuelTypePrimary: 'Electric' },
  },
  // 2023 Honda CR-V EX
  '2HKRW2H56PH123456': {
    year: 2023, make: 'Honda', model: 'CR-V', trim: 'EX',
    bodyStyle: 'SUV', fuelType: 'Gasoline', drivetrain: 'AWD',
    transmission: 'CVT', engineDescription: '1.5L Turbo 4-Cylinder',
    manufacturer: 'American Honda Motor Co.',
    rawPayload: { Make: 'HONDA', Model: 'CR-V', ModelYear: '2023', BodyClass: 'Sport Utility Vehicle (SUV)' },
  },
  // 2018 Chevrolet Silverado 1500 LT
  '3GCUKREC3JG123456': {
    year: 2018, make: 'Chevrolet', model: 'Silverado 1500', trim: 'LT',
    bodyStyle: 'Truck', fuelType: 'Gasoline', drivetrain: '4WD',
    transmission: 'Automatic', engineDescription: '5.3L V8',
    manufacturer: 'General Motors',
    rawPayload: { Make: 'CHEVROLET', Model: 'Silverado 1500', ModelYear: '2018' },
  },
};

export class MockVinDecoder implements VinDecoder {
  readonly name = 'mock';

  async decode(vin: string): Promise<VinDecodeResult> {
    const upper = vin.toUpperCase();
    const fixture = MOCK_FIXTURES[upper];
    if (fixture) {
      return { vin: upper, provider: 'mock', valid: true, decoded: true, warnings: [], ...fixture };
    }
    return {
      vin: upper, provider: 'mock', valid: true, decoded: false,
      warnings: ['VIN not in mock fixture — use a real NHTSA provider for full decode'],
    };
  }
}
