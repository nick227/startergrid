// VIN validation utilities — server-side canonical implementation.
// Client-side should call the format check only (no network); decode is server-only.

const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5,         P: 7,      R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4,
  '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
};

// Position weights for indices 0–16
const POSITION_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

const VALID_CHAR = /^[A-HJ-NPR-Z0-9]$/;

/** Trim, uppercase, strip whitespace/dashes — shared client + server. */
export function normalizeVin(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s\-]/g, '');
}

/** Format-only check: 17 chars, no I/O/Q. Does not hit network. */
export function validateVinFormat(vin: string): { valid: boolean; error?: string } {
  if (vin.length !== 17) {
    return { valid: false, error: `VIN must be 17 characters (got ${vin.length})` };
  }
  for (const ch of vin) {
    if (!VALID_CHAR.test(ch)) {
      return { valid: false, error: `VIN contains invalid character '${ch}' (I, O, Q not allowed)` };
    }
  }
  return { valid: true };
}

/** Compute the expected check digit for position 8 (index 8). Returns '0'-'9' or 'X'. */
export function calculateVinCheckDigit(vin: string): string {
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const charVal = TRANSLITERATION[vin[i]!] ?? 0;
    sum += charVal * (POSITION_WEIGHTS[i] ?? 0);
  }
  const rem = sum % 11;
  return rem === 10 ? 'X' : String(rem);
}

export type VinValidationResult =
  | { valid: true; checkDigitOk: boolean }
  | { valid: false; error: string };

/** Full validation: format check + check digit. */
export function validateVin(raw: string): VinValidationResult {
  const vin = normalizeVin(raw);
  const fmt = validateVinFormat(vin);
  if (!fmt.valid) return { valid: false, error: fmt.error! };

  const expected = calculateVinCheckDigit(vin);
  const actual = vin[8]!;
  // Some model years/countries do not enforce check digit — report but do not fail.
  const checkDigitOk = actual === expected;
  return { valid: true, checkDigitOk };
}
