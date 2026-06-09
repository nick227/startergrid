import type { ContentPackage, DistributionContext } from '../distribution/types.js';
export type { DistributionContext };

export type CatalogItem = {
  id: string;
  fields: Record<string, unknown>;
};

export type CatalogSyncResult = {
  accepted: number;
  rejected: number;
  handles?: string[];
};

export interface CatalogSyncBridge {
  readonly platformSlug: string;
  readonly oauthProvider: string;
  buildItem(pkg: ContentPackage, ctx: DistributionContext): CatalogItem;
  upsertItems(token: string, catalogId: string, items: CatalogItem[]): Promise<CatalogSyncResult>;
  deleteItem(token: string, catalogId: string, itemId: string): Promise<void>;
}
