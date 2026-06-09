import { useState } from 'react';

const LOGO_DOMAINS: Record<string, string> = {
  'google-vehicle-ads':          'merchants.google.com',
  'meta-automotive-ads':         'business.facebook.com',
  'facebook-marketplace-general':'facebook.com',
  'youtube-creator':             'youtube.com',
  'tiktok-automotive-ads':       'ads.tiktok.com',
  'microsoft-automotive-ads':    'ads.microsoft.com',
  'linkedin-lead-gen-forms':     'linkedin.com',
  'pinterest-shopping-ads':      'pinterest.com',
  'reddit-dynamic-product-ads':  'reddit.com',
  'snapchat-dynamic-product-ads':'snapchat.com',
  'x-dynamic-product-ads':       'x.com',
  'nextdoor-ads':                'nextdoor.com',
  'ebay-motors':                 'ebay.com',
  'ebay-resale':                 'ebay.com',
  'cargurus-dealer':             'cargurus.com',
  'autotrader-cox':              'autotrader.com',
  'cars-com':                    'cars.com',
  'truecar-dealer-network':      'truecar.com',
  'apple-business-connect':      'apple.com',
  'shopify-catalog':             'shopify.com',
};

const MONOGRAM_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-600', 'bg-orange-500',
  'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-amber-500',
  'bg-cyan-600', 'bg-violet-500',
];

function slugColor(slug: string): string {
  let hash = 0;
  for (const c of slug) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return MONOGRAM_COLORS[hash % MONOGRAM_COLORS.length];
}

function monogram(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

type Props = {
  slug: string;
  name: string;
  size?: 'sm' | 'md';
};

export function PlatformLogo({ slug, name, size = 'md' }: Props) {
  const domain = LOGO_DOMAINS[slug];
  const [imgFailed, setImgFailed] = useState(false);
  const dim = size === 'sm' ? 'w-6 h-6 text-[9px]' : 'w-8 h-8 text-[10px]';

  if (domain && !imgFailed) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
        alt=""
        aria-hidden
        width={size === 'sm' ? 24 : 32}
        height={size === 'sm' ? 24 : 32}
        className={`${dim} rounded-sm shrink-0 object-contain`}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-sm shrink-0 flex items-center justify-center text-white font-bold ${slugColor(slug)}`}
      aria-hidden
    >
      {monogram(name)}
    </div>
  );
}
