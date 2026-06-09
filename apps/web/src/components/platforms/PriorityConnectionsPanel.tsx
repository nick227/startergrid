import { useState } from 'react';
import type { PlatformPublishResult, PlatformAccountDetail } from '@/lib/types.ts';
import { platformConnectionWithAccount, oauthProviderDisplayName } from '@/lib/platformPresentation.ts';
import { OAuthConnectButton } from './OAuthConnectButton.tsx';
import { updateAccount } from '@/lib/api/sdk.ts';

type Props = {
  platforms: PlatformPublishResult[];
  accountBySlug: Map<string, PlatformAccountDetail>;
  dealerId: string;
  onDone: () => void;
  onSelectSlug: (slug: string) => void;
};

type PriorityRowProps = {
  platform: PlatformPublishResult;
  account: PlatformAccountDetail;
  dealerId: string;
  onDone: () => void;
  onSelectSlug: (slug: string) => void;
};

function PriorityRow({ platform, account, dealerId, onDone, onSelectSlug }: PriorityRowProps) {
  const conn = platformConnectionWithAccount(platform, account);
  const [marking, setMarking] = useState(false);

  const handleMarkApplied = async () => {
    setMarking(true);
    try {
      await updateAccount(dealerId, platform.platformSlug, { state: 'PENDING_REVIEW' });
      onDone();
    } catch {
      setMarking(false);
    }
  };

  let cta: React.ReactNode = null;

  if (conn.connection === 'needs_oauth' && account.oauthProvider) {
    cta = (
      <OAuthConnectButton
        dealerId={dealerId}
        platformSlug={platform.platformSlug}
        providerDisplayName={oauthProviderDisplayName(account.oauthProvider)}
        isReconnect={account.oauthExpired}
        onDone={onDone}
      />
    );
  } else if (conn.connection === 'partner_pending' && account.partnerSignup) {
    cta = (
      <span className="text-xs text-blue-600 font-medium">
        Applied · {account.partnerSignup.estimatedDays}
      </span>
    );
  } else if (account.partnerSignup && account.state === 'ACCOUNT_NEEDED') {
    cta = (
      <div className="flex items-center gap-2">
        <a
          href={account.partnerSignup.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-2.5 py-0.5 text-[11px] font-bold rounded-md text-white bg-blue-500 hover:bg-blue-600 transition-colors"
        >
          Apply →
        </a>
        <button
          type="button"
          disabled={marking}
          onClick={() => void handleMarkApplied()}
          className="text-[11px] text-ink-muted hover:text-ink underline underline-offset-2 disabled:opacity-50"
        >
          {marking ? 'Saving…' : 'Mark as applied'}
        </button>
      </div>
    );
  } else {
    cta = (
      <button
        type="button"
        onClick={() => onSelectSlug(platform.platformSlug)}
        className="shrink-0 px-2.5 py-0.5 text-[11px] font-bold rounded-md border border-border-subtle text-ink-muted hover:text-ink hover:border-border transition-colors"
      >
        Setup →
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-md bg-surface-subtle border border-border-subtle">
      <div className="min-w-0 flex items-center gap-2">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm border text-[10px] font-semibold ${conn.pill}`}>
          T1
        </span>
        <span className="text-sm font-medium text-ink truncate">{platform.platformName}</span>
        <span className="text-xs text-ink-faint hidden sm:inline">· {conn.label}</span>
      </div>
      <div className="shrink-0">{cta}</div>
    </div>
  );
}

export function PriorityConnectionsPanel({
  platforms,
  accountBySlug,
  dealerId,
  onDone,
  onSelectSlug,
}: Props) {
  const tier1 = platforms.filter(p => {
    const account = accountBySlug.get(p.platformSlug);
    return account?.tier === 1;
  });

  const unconnected = tier1.filter(p => {
    const account = accountBySlug.get(p.platformSlug);
    const conn = platformConnectionWithAccount(p, account);
    return conn.connection !== 'connected';
  });

  if (!unconnected.length) return null;

  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
        Priority platforms
      </p>
      <div className="space-y-1.5">
        {unconnected.map(platform => {
          const account = accountBySlug.get(platform.platformSlug);
          if (!account) return null;
          return (
            <PriorityRow
              key={platform.platformSlug}
              platform={platform}
              account={account}
              dealerId={dealerId}
              onDone={onDone}
              onSelectSlug={onSelectSlug}
            />
          );
        })}
      </div>
    </div>
  );
}
