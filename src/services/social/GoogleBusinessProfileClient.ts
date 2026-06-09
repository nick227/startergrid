const ACCOUNTS_BASE = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const BUSINESS_INFO_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const LOCAL_POSTS_BASE = 'https://mybusiness.googleapis.com/v4';

export type GBPLocationInfo = {
  id: string;         // full resource name, e.g. "accounts/123/locations/456"
  name: string;       // display name
  accessToken: string;
  category?: string;
  pictureUrl?: string;
};

export type GBPLocalPostResult = {
  name: string;       // e.g. "accounts/123/locations/456/localPosts/789"
};

type AccountsResponse = {
  accounts?: Array<{ name: string; accountName: string; type: string }>;
  error?: { message: string; code: number };
};

type LocationsResponse = {
  locations?: Array<{
    name: string;
    title: string;
    categories?: { primaryCategory?: { displayName: string } };
  }>;
  error?: { message: string; code: number };
};

type LocalPostResponse = GBPLocalPostResult & {
  error?: { message: string; code: number };
};

async function gbpFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json = (await res.json()) as T & { error?: { message: string; code: number } };
  const err = (json as { error?: { message: string; code: number } }).error;
  if (err) throw new Error(`Google Business Profile API error ${err.code}: ${err.message}`);
  if (!res.ok) throw new Error(`Google Business Profile API HTTP ${res.status}`);
  return json;
}

export const GoogleBusinessProfileClient = {
  async listLocations(accessToken: string): Promise<GBPLocationInfo[]> {
    const accountsData = await gbpFetch<AccountsResponse>(
      `${ACCOUNTS_BASE}/accounts`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const accounts = accountsData.accounts ?? [];

    const locations: GBPLocationInfo[] = [];

    for (const account of accounts) {
      const locData = await gbpFetch<LocationsResponse>(
        `${BUSINESS_INFO_BASE}/${account.name}/locations?readMask=name,title,categories`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      for (const loc of locData.locations ?? []) {
        locations.push({
          id: loc.name,
          name: loc.title,
          accessToken,
          category: loc.categories?.primaryCategory?.displayName,
        });
      }
    }

    return locations;
  },

  async createLocalPost(
    accessToken: string,
    locationName: string,
    summary: string,
    callToActionUrl?: string,
    mediaUrl?: string,
  ): Promise<GBPLocalPostResult> {
    const body: Record<string, unknown> = {
      languageCode: 'en-US',
      summary,
      topicType: 'STANDARD',
    };

    if (callToActionUrl) {
      body['callToAction'] = { actionType: 'LEARN_MORE', url: callToActionUrl };
    }

    if (mediaUrl) {
      body['media'] = [{ mediaFormat: 'PHOTO', sourceUrl: mediaUrl }];
    }

    const result = await gbpFetch<LocalPostResponse>(
      `${LOCAL_POSTS_BASE}/${locationName}/localPosts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!result.name) throw new Error('Google Business Profile API returned no post name');
    return { name: result.name };
  },
};
