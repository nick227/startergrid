import type { VinDecoder, VinDecodeResult } from './vinDecoder.js';

const NHTSA_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues';
const TIMEOUT_MS = 5000;

// Map NHTSA field names to our normalized VinDecodeResult fields.
const FIELD_MAP: Record<string, keyof VinDecodeResult> = {
  ModelYear:         'year',
  Make:              'make',
  Model:             'model',
  Trim:              'trim',
  BodyClass:         'bodyStyle',
  FuelTypePrimary:   'fuelType',
  DriveType:         'drivetrain',
  TransmissionStyle: 'transmission',
  Manufacturer:      'manufacturer',
};

type NhtsaResponse = {
  Results: Array<Record<string, string>>;
  Count: number;
};

function extractRaw(result: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(result)) {
    if (v && v !== 'Not Applicable' && v !== '0') out[k] = v;
  }
  return out;
}

function mapFields(raw: Record<string, string>): Partial<VinDecodeResult> {
  const out: Partial<VinDecodeResult> = {};
  for (const [nhtsaKey, ourKey] of Object.entries(FIELD_MAP)) {
    const val = raw[nhtsaKey];
    if (!val || val === 'Not Applicable') continue;
    if (ourKey === 'year') {
      const y = parseInt(val, 10);
      if (!isNaN(y)) out.year = y;
    } else {
      (out as Record<string, unknown>)[ourKey] = val;
    }
  }
  // Build engineDescription from cylinders + displacement if available
  const cyl = raw['EngineCylinders'];
  const disp = raw['DisplacementL'];
  if (cyl || disp) {
    const parts = [disp ? `${parseFloat(disp).toFixed(1)}L` : '', cyl ? `${cyl}-Cylinder` : ''];
    out.engineDescription = parts.filter(Boolean).join(' ');
  }
  return out;
}

export class NhtsaVpicVinDecoder implements VinDecoder {
  readonly name = 'nhtsa-vpic';

  async decode(vin: string): Promise<VinDecodeResult> {
    const upper = vin.toUpperCase();
    const url = `${NHTSA_URL}/${encodeURIComponent(upper)}?format=json`;
    let raw: Record<string, string> = {};

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!resp.ok) {
        return {
          vin: upper, provider: this.name, valid: true, decoded: false,
          warnings: [`NHTSA returned HTTP ${resp.status}`],
        };
      }

      const data = (await resp.json()) as NhtsaResponse;
      const result = data?.Results?.[0];
      if (!result) {
        return {
          vin: upper, provider: this.name, valid: true, decoded: false,
          warnings: ['NHTSA returned empty results'],
        };
      }

      raw = extractRaw(result);
      const fields = mapFields(raw);
      const decoded = !!(fields.make && fields.model);

      return {
        vin: upper, provider: this.name, valid: true, decoded,
        warnings: decoded ? [] : ['NHTSA could not decode this VIN — make/model unavailable'],
        rawPayload: raw,
        ...fields,
      };
    } catch (err: unknown) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        vin: upper, provider: this.name, valid: true, decoded: false,
        warnings: [isTimeout ? 'NHTSA request timed out' : 'NHTSA request failed'],
      };
    }
  }
}
