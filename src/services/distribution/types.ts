export type BusinessObjectType = 'VEHICLE' | 'PRODUCT' | 'EVENT' | 'LISTING';

export type ContentPackage = {
  objectType: BusinessObjectType;
  objectId: string;
  headline: string;
  body: string;
  summary: string;
  imageUrls: string[];
  link: string;
  price?: number; // cents
  structuredData: Record<string, unknown>;
  tags: string[];
};

export type DistributionContext = {
  dealershipId: string;
  listingBaseUrl: string;
  dealerName?: string;
};

export type DistributionResult = {
  externalId: string;
  externalUrl?: string;
};

export interface DistributionAdapter<TAccount, TResult extends DistributionResult = DistributionResult> {
  readonly platformSlug: string;
  publish(account: TAccount, pkg: ContentPackage, context?: DistributionContext): Promise<TResult>;
}
