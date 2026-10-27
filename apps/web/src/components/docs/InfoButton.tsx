import { docTitle } from '@/lib/docs/registry.ts';
import { documentationUrl } from '@/lib/docs/urls.ts';

type Props = { docId: string; className?: string; size?: 'sm' | 'md' };

export function InfoButton({ docId, className = '', size = 'sm' }: Props) {
  const label = docTitle(docId);
  const dim = size === 'sm' ? 'w-4 h-4 text-[10px]' : 'w-5 h-5 text-xs';
  return (
    <a href={documentationUrl(docId)} target="_blank" rel="noopener noreferrer"
      aria-label={`${label} — read more (opens in a new tab)`} title={label}
      className={`inline-flex items-center justify-center rounded-full border border-silver-300 bg-surface-card text-ink-muted hover:text-orange-600 hover:border-orange-500/40 hover:bg-orange-100 transition-colors shrink-0 ${dim} ${className}`}>
      i
    </a>
  );
}
