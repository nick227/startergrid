import type { PlatformAccountDetail, PlatformPublishResult } from '@/lib/types.ts';
import { oauthProviderDisplayName } from '@/lib/platformPresentation.ts';
import { useOAuthConnect } from '@/hooks/useOAuthConnect.ts';

type OAuthGroup = {
  provider: string;
  displayName: string;
  platforms: Array<{ slug: string; name: string }>;
  connectSlug: string;
};

type BannerRowProps = {
  group: OAuthGroup;
  dealerId: string;
  onDone: () => void;
};

function BannerRow({ group, dealerId, onDone }: BannerRowProps) {
  const { connecting, connected, connect } = useOAuthConnect(dealerId, group.connectSlug, onDone);
  const names = group.platforms.map(p => p.name).join(', ');
  const count = group.platforms.length;

  return (
    <div className={`flex items-center justify-between gap-4 rounded-md border px-4 py-2.5 transition-colors ${
      connected ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
    }`}>
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${connected ? 'text-green-900' : 'text-amber-900'}`}>
          {connected ? `${group.displayName} connected` : `Connect ${group.displayName}`}
        </p>
        <p className={`text-xs truncate ${connected ? 'text-green-700' : 'text-amber-700'}`}>
          {connected
            ? `${count} ${count === 1 ? 'channel' : 'channels'} now active`
            : `One login activates ${count} ${count === 1 ? 'channel' : 'channels'}: ${names}`}
        </p>
      </div>
      <button
        type="button"
        disabled={connecting || connected}
        onClick={() => void connect()}
        className={`shrink-0 px-3 py-1.5 text-xs font-bold rounded-md text-white transition-colors ${
          connected
            ? 'bg-green-500 cursor-default'
            : 'bg-amber-500 hover:bg-amber-600 disabled:opacity-60'
        }`}
      >
        {connected ? 'Connected ✓' : connecting ? 'Connecting…' : `Connect ${group.displayName} →`}
      </button>
    </div>
  );
}

type Props = {
  platforms: PlatformPublishResult[];
  accountBySlug: Map<string, PlatformAccountDetail>;
  dealerId: string;
  onDone: () => void;
};

export function OAuthConnectBanner({ platforms, accountBySlug, dealerId, onDone }: Props) {
  const groupMap = new Map<string, OAuthGroup>();

  for (const p of platforms) {
    const acct = accountBySlug.get(p.platformSlug);
    if (!acct?.oauthProvider || acct.oauthConnected) continue;
    const provider = acct.oauthProvider;
    const existing = groupMap.get(provider);
    if (existing) {
      existing.platforms.push({ slug: p.platformSlug, name: p.platformName });
    } else {
      groupMap.set(provider, {
        provider,
        displayName: oauthProviderDisplayName(provider),
        platforms: [{ slug: p.platformSlug, name: p.platformName }],
        connectSlug: p.platformSlug,
      });
    }
  }

  // Only surface the banner when a single login covers multiple channels — otherwise
  // the inline row CTA is sufficient and the banner is just noise.
  const multiGroups = [...groupMap.values()].filter(g => g.platforms.length >= 2);
  if (!multiGroups.length) return null;

  return (
    <div className="space-y-2 mb-5">
      {multiGroups.map(group => (
        <BannerRow key={group.provider} group={group} dealerId={dealerId} onDone={onDone} />
      ))}
    </div>
  );
}
