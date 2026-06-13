import type { IdentifierDecoder, IdentifierDecodeResult } from './identifierDecoder.js';

const ISBN_PATTERN = /^97[89][0-9]{10}$/;

const FIXTURES: Record<string, Omit<IdentifierDecodeResult, 'identifier' | 'provider' | 'valid' | 'decoded' | 'warnings'>> = {
  '9780743273565': { fields: { isbn: '9780743273565', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', publisher: 'Scribner', language: 'English', pageCount: 180 } },
  '9780061965012': { fields: { isbn: '9780061965012', title: 'To Kill a Mockingbird', author: 'Harper Lee', publisher: 'Harper Perennial', language: 'English', pageCount: 336 } },
  '9780451524935': { fields: { isbn: '9780451524935', title: 'Nineteen Eighty-Four', author: 'George Orwell', publisher: 'Signet Classic', language: 'English', pageCount: 328 } },
  '9780385333481': { fields: { isbn: '9780385333481', title: 'The Handmaid\'s Tale', author: 'Margaret Atwood', publisher: 'Anchor Books', language: 'English', pageCount: 311 } },
};

export class MockIsbnDecoder implements IdentifierDecoder {
  readonly name = 'mock-isbn';

  async decode(identifier: string): Promise<IdentifierDecodeResult> {
    const normalized = identifier.replace(/[-\s]/g, '');
    const valid = ISBN_PATTERN.test(normalized);

    if (!valid) {
      return {
        identifier: normalized,
        provider: this.name,
        valid: false,
        decoded: false,
        fields: {},
        warnings: ['ISBN must be 13 digits starting with 978 or 979'],
      };
    }

    const fixture = FIXTURES[normalized];
    if (fixture) {
      return { identifier: normalized, provider: this.name, valid: true, decoded: true, warnings: [], ...fixture };
    }

    return {
      identifier: normalized,
      provider: this.name,
      valid: true,
      decoded: false,
      fields: { isbn: normalized },
      warnings: ['ISBN format valid but not found in mock data — use real decoder in production'],
    };
  }
}
