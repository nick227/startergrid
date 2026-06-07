import { useState } from 'react';
import { shareListing } from '../../features/listings/listingShare.ts';

type Props = {
  title: string;
  url: string;
  className?: string;
  compact?: boolean;
};

export function ShareListingButton({ title, url, className = '', compact = false }: Props) {
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleShare() {
    const result = await shareListing({ title, url });
    if (result === 'shared') setFeedback('Shared');
    else if (result === 'copied') setFeedback('Link copied');
    else setFeedback('Could not share');

    window.setTimeout(() => setFeedback(null), 2000);
  }

  const label = feedback ?? (compact ? 'Share' : 'Share listing');

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className={`mp-btn-secondary ${compact ? 'px-3 py-2 text-sm' : 'w-full sm:w-auto'} ${className}`}
      aria-live="polite"
    >
      {label}
    </button>
  );
}
