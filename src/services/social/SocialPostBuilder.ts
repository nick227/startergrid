import type { ContentPackage } from '../distribution/types.js';

export type PostPreview = {
  postText: string;
  imageUrl: string | null;
  listingUrl: string;
};

export const SocialPostBuilder = {
  buildPreview(pkg: ContentPackage): PostPreview {
    return {
      postText: pkg.body,
      imageUrl: pkg.imageUrls[0] ?? null,
      listingUrl: pkg.link,
    };
  },
};
