import { useMarketplaceFeed } from '../../hooks/useMarketplaceFeed.ts';
import { type AutomotiveListParams } from './automotiveLinks.ts';

type Props = {
  params: AutomotiveListParams;
  fallbackImageUrl: string;
  alt: string;
  className?: string;
};

export function FeedImage({ params, fallbackImageUrl, alt, className = '' }: Props) {
  const { vehicles, loading } = useMarketplaceFeed({ 
    ...params, 
    limit: 1, 
    sortBy: 'newest' 
  });

  // Try to grab the first photo of the first matched vehicle
  const liveImageUrl = vehicles[0]?.mediaUrls?.[0];

  // While loading, or if no live image exists, we use the fallback
  const src = (!loading && liveImageUrl) ? liveImageUrl : fallbackImageUrl;

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
    />
  );
}
