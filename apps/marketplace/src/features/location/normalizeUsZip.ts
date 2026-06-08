/** Normalize a US ZIP or ZIP+4 input to a five-digit string, or null when invalid. */
export function normalizeUsZip(postalCode: string): string | null {
  const digits = postalCode.trim().replace(/\D/g, '');
  if (digits.length < 5) return null;
  const zip = digits.slice(0, 5);
  return /^\d{5}$/.test(zip) ? zip : null;
}
