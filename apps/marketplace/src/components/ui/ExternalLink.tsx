import type { ReactNode } from 'react';
import { sanitizeExternalUrl } from '../../lib/links.ts';

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function ExternalLink({ href, children, className = '' }: Props) {
  const safe = sanitizeExternalUrl(href);
  if (!safe) return null;

  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`mp-focus inline-flex items-center gap-1 text-cta transition hover:text-cta-hover ${className}`}
    >
      {children}
      <span aria-hidden="true">↗</span>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
