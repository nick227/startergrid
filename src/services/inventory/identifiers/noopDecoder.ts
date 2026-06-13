import type { IdentifierDecoder, IdentifierDecodeResult } from './identifierDecoder.js';

/**
 * Passthrough decoder for categories where the identifier is dealer-assigned
 * (e.g. SKU / Work ID) and no external lookup exists. The identifier is
 * returned as-is under its own key in fields.
 */
export class NoopIdentifierDecoder implements IdentifierDecoder {
  readonly name = 'noop';

  constructor(private readonly fieldKey: string = 'sku') {}

  async decode(identifier: string): Promise<IdentifierDecodeResult> {
    return {
      identifier,
      provider: 'noop',
      valid: identifier.trim().length > 0,
      decoded: false,
      fields: { [this.fieldKey]: identifier },
      warnings: [],
    };
  }
}
