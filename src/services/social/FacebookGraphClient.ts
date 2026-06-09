const GRAPH_BASE = 'https://graph.facebook.com/v20.0';

export type FacebookPageInfo = {
  id: string;
  name: string;
  accessToken: string;
  category?: string;
  pictureUrl?: string;
};

export type FacebookPostResult = {
  id: string; // "{pageId}_{postId}"
};

type GraphPagesResponse = {
  data: Array<{
    id: string;
    name: string;
    access_token: string;
    category?: string;
    picture?: { data?: { url?: string } };
  }>;
  error?: { message: string; code: number };
};

type GraphPostResponse = {
  id?: string;
  error?: { message: string; code: number };
};

async function graphFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json = (await res.json()) as T & { error?: { message: string; code: number } };
  const err = (json as { error?: { message: string; code: number } }).error;
  if (err) throw new Error(`Facebook Graph API error ${err.code}: ${err.message}`);
  if (!res.ok) throw new Error(`Facebook Graph API HTTP ${res.status}`);
  return json;
}

export const FacebookGraphClient = {
  async getPages(userAccessToken: string): Promise<FacebookPageInfo[]> {
    const params = new URLSearchParams({
      fields: 'id,name,access_token,category,picture',
      access_token: userAccessToken,
    });
    const data = await graphFetch<GraphPagesResponse>(
      `${GRAPH_BASE}/me/accounts?${params.toString()}`
    );
    return (data.data ?? []).map(p => ({
      id: p.id,
      name: p.name,
      accessToken: p.access_token,
      category: p.category,
      pictureUrl: p.picture?.data?.url,
    }));
  },

  async publishPost(
    pageAccessToken: string,
    pageId: string,
    message: string,
    link?: string,
  ): Promise<FacebookPostResult> {
    const body = new URLSearchParams({ message, access_token: pageAccessToken });
    if (link) body.set('link', link);

    const data = await graphFetch<GraphPostResponse>(`${GRAPH_BASE}/${pageId}/feed`, {
      method: 'POST',
      body,
    });

    if (!data.id) throw new Error('Facebook Graph API returned no post id');
    return { id: data.id };
  },
};
