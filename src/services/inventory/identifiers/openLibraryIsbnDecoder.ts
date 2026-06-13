import type { IdentifierDecoder, IdentifierDecodeResult } from './identifierDecoder.js';

const ISBN_PATTERN = /^97[89][0-9]{10}$/;
const OPEN_LIBRARY_URL = 'https://openlibrary.org/api/books';
const TIMEOUT_MS = 5000;

export class OpenLibraryIsbnDecoder implements IdentifierDecoder {
  readonly name = 'open-library';

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

    try {
      const url = `${OPEN_LIBRARY_URL}?bibkeys=ISBN:${normalized}&format=json&jscmd=data`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        return this.validButUnresolved(normalized, `Open Library responded with ${res.status}`);
      }

      const json = await res.json() as Record<string, unknown>;
      const key = `ISBN:${normalized}`;
      const book = json[key] as Record<string, unknown> | undefined;

      if (!book) {
        return this.validButUnresolved(normalized, 'ISBN not found in Open Library');
      }

      const authors = (book['authors'] as { name: string }[] | undefined)?.map(a => a.name).join(', ') ?? null;
      const publishers = (book['publishers'] as { name: string }[] | undefined)?.map(p => p.name).join(', ') ?? null;
      const pageCount = typeof book['number_of_pages'] === 'number' ? book['number_of_pages'] : null;
      const publishDate = typeof book['publish_date'] === 'string' ? book['publish_date'] : null;

      return {
        identifier: normalized,
        provider: this.name,
        valid: true,
        decoded: true,
        fields: {
          isbn: normalized,
          title: book['title'] ?? null,
          author: authors,
          publisher: publishers,
          pageCount,
          publishDate,
        },
        warnings: [],
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return this.validButUnresolved(normalized, `Open Library lookup failed: ${msg}`);
    }
  }

  private validButUnresolved(identifier: string, warning: string): IdentifierDecodeResult {
    return {
      identifier,
      provider: this.name,
      valid: true,
      decoded: false,
      fields: { isbn: identifier },
      warnings: [warning],
    };
  }
}
