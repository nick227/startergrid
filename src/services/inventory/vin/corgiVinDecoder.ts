import { createDecoder } from '@cardog/corgi';
import type { VinDecoder, VinDecodeResult } from './vinDecoder.js';

export class CorgiVinDecoder implements VinDecoder {
  readonly name = 'corgi';
  private decoderPromise: Promise<any> | null = null;

  private async getDecoder() {
    if (!this.decoderPromise) {
      this.decoderPromise = createDecoder();
    }
    return this.decoderPromise;
  }

  async decode(vin: string): Promise<VinDecodeResult> {
    const upper = vin.toUpperCase();
    try {
      const decoder = await this.getDecoder();
      const result = await decoder.decode(upper);

      if (!result.valid) {
        return {
          vin: upper,
          provider: this.name,
          valid: true, // We already format-validated it before calling this
          decoded: false,
          warnings: ['Corgi could not decode this VIN'],
        };
      }

      const vehicle = result.components?.vehicle || {};
      const engine = result.components?.engine || {};

      const decoded = !!(vehicle.make && vehicle.model);
      
      let year: number | undefined;
      const yr = vehicle.year;
      if (typeof yr === 'number') year = yr;
      else if (typeof yr === 'string') year = parseInt(yr, 10);

      const make = vehicle.make;
      const model = vehicle.model;
      const trim = vehicle.series;
      const bodyStyle = vehicle.bodyStyle;
      const fuelType = vehicle.fuelType || engine.fuel;
      const drivetrain = vehicle.driveType;
      const transmission = vehicle.transmissionStyle;
      
      let engineDescription: string | undefined;
      if (engine.model) {
        engineDescription = engine.model;
      } else if (engine.displacement || engine.cylinders) {
        const parts = [];
        if (engine.displacement) parts.push(`${engine.displacement}L`);
        if (engine.cylinders) parts.push(`${engine.cylinders} Cyl`);
        engineDescription = parts.join(' ');
      }

      return {
        vin: upper,
        provider: this.name,
        valid: true,
        decoded,
        warnings: decoded ? [] : ['Corgi could not decode this VIN — make/model unavailable'],
        year: year && !isNaN(year) ? year : undefined,
        make,
        model,
        trim,
        bodyStyle,
        fuelType,
        drivetrain,
        transmission,
        engineDescription,
        rawPayload: result,
      };
    } catch (err: unknown) {
      return {
        vin: upper,
        provider: this.name,
        valid: true,
        decoded: false,
        warnings: ['Corgi local decode failed'],
      };
    }
  }
}
