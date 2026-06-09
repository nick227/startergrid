import { useState } from 'react';
import type { SocialPost } from '@/lib/types.ts';
import { fetchSocialPosts, publishSocialPost } from '@/lib/api/sdk.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { timeAgo } from '@/lib/timeAgo.ts';

type Props = {
  dealerId: string;
  platformSlug: string;
};

const STATUS_PILL: Record<SocialPost['status'], string> = {
  PUBLISHED: 'bg-green-50 text-green-700 border-green-200',
  DRAFT:     'bg-silver-50 text-ink-muted border-silver-200',
  FAILED:    'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABEL: Record<SocialPost['status'], string> = {
  PUBLISHED: 'Published',
  DRAFT:     'Draft',
  FAILED:    'Failed',
};

function PostRow({ post, onRetry }: { post: SocialPost; onRetry: (post: SocialPost) => Promise<void> }) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try { await onRetry(post); } finally { setRetrying(false); }
  };

  return (
    <div className="py-3 border-b border-silver-100 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${STATUS_PILL[post.status]}`}>
              {STATUS_LABEL[post.status]}
            </span>
            {post.pageAccount && (
              <span className="text-[11px] text-ink-muted truncate max-w-[140px]">
                {post.pageAccount.name}
              </span>
            )}
          </div>
          <p className="text-xs text-ink-body line-clamp-2 leading-relaxed">{post.postText}</p>
          {post.errorMessage && (
            <p className="text-[11px] text-red-600">{post.errorMessage}</p>
          )}
        </div>
        <div className="shrink-0 text-right space-y-1">
          <p className="text-[10px] text-ink-faint tabular-nums">
            {post.publishedAt ? timeAgo(post.publishedAt) : timeAgo(post.createdAt)}
          </p>
          {post.externalUrl && (
            <a
              href={post.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[11px] font-semibold text-orange-600 hover:underline"
            >
              View post →
            </a>
          )}
          {post.status === 'FAILED' && (
            <button
              type="button"
              disabled={retrying}
              onClick={() => void handleRetry()}
              className="block text-[11px] font-semibold text-navy-600 hover:underline disabled:opacity-50"
            >
              {retrying ? 'Retrying…' : 'Retry'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SocialPostsTab({ dealerId, platformSlug }: Props) {
  const { data, loading, error, reload } = useAsyncQuery(
    () => fetchSocialPosts(dealerId, platformSlug),
    [dealerId, platformSlug],
  );

  const handleRetry = async (post: SocialPost) => {
    await publishSocialPost(dealerId, platformSlug, post.vehicleId);
    reload();
  };

  if (loading) return <p className="text-xs text-ink-faint py-3">Loading posts…</p>;
  if (error) return <p className="text-xs text-status-error-text py-3">{error}</p>;

  const posts = data?.posts ?? [];
  if (!posts.length) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-ink-faint">No posts yet.</p>
        <p className="text-[11px] text-ink-faint mt-1">
          Use &ldquo;Create Post&rdquo; on a vehicle to publish your first post.
        </p>
      </div>
    );
  }

  return (
    <div>
      {posts.map(post => (
        <PostRow key={post.id} post={post} onRetry={handleRetry} />
      ))}
    </div>
  );
}
