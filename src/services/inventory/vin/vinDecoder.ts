/** Normalized output from any VIN decode provider. */
export type VinDecodeResult = {
  vin: string;
  provider: string;
  valid: boolean;
  decoded: boolean;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyStyle?: string;
  fuelType?: string;
  drivetrain?: string;
  transmission?: string;
  engineDescription?: string;
  manufacturer?: string;
  warnings: string[];
  /** Sanitized provider output — no secrets, no PII. */
  rawPayload?: Record<string, string>;
};

/** Swappable VIN decode provider. Mock and NHTSA implement this interface. */
export interface VinDecoder {
  readonly name: string;
  decode(vin: string): Promise<VinDecodeResult>;
}
