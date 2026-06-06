import { useDocReader } from './DocReaderContext.tsx';
import { docTitle } from '@/lib/docs/registry.ts';

type Props = {
  docId: string;
  className?: string;
  size?: 'sm' | 'md';
};

export function InfoButton({ docId, className = '', size = 'sm' }: Props) {
  const { openDoc } = useDocReader();
  const label = docTitle(docId);
  const dim = size === 'sm' ? 'w-4 h-4 text-[10px]' : 'w-5 h-5 text-xs';

  return (
    <button
      type="button"
      onClick={() => openDoc(docId)}
      aria-label={`${label} — read more`}
      title={label}
      className={`inline-flex items-center justify-center rounded-full border border-silver-300 bg-surface-card text-ink-muted hover:text-orange-600 hover:border-orange-500/40 hover:bg-orange-100 transition-colors shrink-0 ${dim} ${className}`}
    >
      i
    </button>
  );
}
