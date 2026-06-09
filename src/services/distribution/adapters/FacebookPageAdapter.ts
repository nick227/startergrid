import type { DistributionAdapter, ContentPackage, DistributionContext, DistributionResult } from '../types.js';
import { FacebookGraphClient } from '../../social/FacebookGraphClient.js';

export type FacebookPageAccount = {
  pageId: string;
  pageAccessToken: string;
};

export type FacebookDistributionResult = DistributionResult & {
  pageId: string;
};

export const FacebookPageAdapter: DistributionAdapter<FacebookPageAccount, FacebookDistributionResult> = {
  platformSlug: 'facebook-business-page',

  async publish(
    account: FacebookPageAccount,
    pkg: ContentPackage,
    _context?: DistributionContext,
  ): Promise<FacebookDistributionResult> {
    const result = await FacebookGraphClient.publishPost(
      account.pageAccessToken,
      account.pageId,
      pkg.body,
      pkg.link,
    );

    const postId = result.id.includes('_') ? result.id.split('_')[1] : result.id;
    const externalUrl = `https://www.facebook.com/${account.pageId}/posts/${postId}`;

    return { externalId: result.id, externalUrl, pageId: account.pageId };
  },
};
