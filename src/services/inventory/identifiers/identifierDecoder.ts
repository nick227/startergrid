/**
 * Generic identifier decode result. Fields are category-specific — an ISBN
 * decode returns title/author/publisher; a no-op decode returns { sku }.
 */
export type IdentifierDecodeResult = {
  identifier: string;
  provider: string;
  valid: boolean;
  decoded: boolean;
  fields: Record<string, unknown>;
  warnings: string[];
};

export interface IdentifierDecoder {
  readonly name: string;
  decode(identifier: string): Promise<IdentifierDecodeResult>;
}
