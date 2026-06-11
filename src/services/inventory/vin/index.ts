export type { VinDecodeResult, VinDecoder } from './vinDecoder.js';
export { normalizeVin, validateVinFormat, validateVin, calculateVinCheckDigit } from './vinValidator.js';
export type { VinValidationResult } from './vinValidator.js';
export { MockVinDecoder } from './mockVinDecoder.js';
export { NhtsaVpicVinDecoder } from './nhtsaVpicDecoder.js';

import { MockVinDecoder } from './mockVinDecoder.js';
import { NhtsaVpicVinDecoder } from './nhtsaVpicDecoder.js';
import type { VinDecoder } from './vinDecoder.js';

/** Selects the VIN decoder based on VIN_DECODER_PROVIDER env var.
 *  Defaults to 'mock' in test/dev and 'nhtsa' in production. */
export function resolveVinDecoder(): VinDecoder {
  const provider = process.env['VIN_DECODER_PROVIDER']
    ?? (process.env['NODE_ENV'] === 'production' ? 'nhtsa' : 'mock');

  switch (provider) {
    case 'nhtsa': return new NhtsaVpicVinDecoder();
    default:       return new MockVinDecoder();
  }
}
