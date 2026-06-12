import { useState } from 'react';
import type { PlatformPublishResult, PlatformAccountDetail } from '@/lib/types.ts';
import {
  platformConnectionWithAccount,
  oauthProviderDisplayName,
  platformBenefitLine,
  effortBadge,
  type PlatformConnectionMeta,
} from '@/lib/platformPresentation.ts';
import { PlatformLogo } from './PlatformLogo.tsx';
import { OAuthConnectButton } from './OAuthConnectButton.tsx';
import { updateAccount } from '@/lib/api/sdk.ts';

type PlatformWithConn = {
  platform: PlatformPublishResult;
  account: PlatformAccountDetail;
  conn: PlatformConnectionMeta;
  priority: number;
};

function scorePlatform(
  _platform: PlatformPublishResult,
  account: PlatformAccountDetail,
  conn: PlatformConnectionMeta
): number {
  // Lower number = shown first
  if (account.oauthExpired) return 0;                          // Expired tokens: urgent
  if (conn.connection === 'needs_oauth' && account.tier === 1) return 1;  // Tier-1 OAuth: fastest win
  if (conn.connection === 'needs_oauth' && account.tier === 2) return 2;
  if (conn.connection === 'needs_oauth') return 3;
  if (conn.connection === 'inactive' && account.partnerSignup && account.tier === 1) return 4; // Tier-1 partner apply
  if (conn.connection === 'inactive' && account.partnerSignup) return 5;
  if (conn.connection === 'partner_pending' && account.tier === 1) return 6;
  if (conn.connection === 'inactive' && account.tier === 1) return 7;     // Tier-1 credentials
  return 99;
}

type RowProps = {
  item: PlatformWithConn;
  dealerId: string;
  onDone: () => void;
  onSelectSlug: (slug: string) => void;
};

function ActionRow({ item, dealerId, onDone, onSelectSlug }: RowProps) {
  const { platform, account, conn } = item;
  const benefit = platformBenefitLine(platform.platformSlug);
  const badge = effortBadge(account);
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
  } else if (conn.connection === 'partner_pending') {
    cta = (
      <span className="text-[11px] text-blue-600 font-medium">
        {account.partnerSignup ? `Awaiting · ${account.partnerSignup.estimatedDays}` : 'Pending review'}
      </span>
    );
  } else if (account.partnerSignup && account.state === 'ACCOUNT_NEEDED') {
    cta = (
      <div className="flex items-center gap-2">
        <a
          href={account.partnerSignup.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-0.5 text-[11px] font-bold rounded-md text-white bg-blue-500 hover:bg-blue-600 transition-colors"
        >
          Apply →
        </a>
        <button
          type="button"
          disabled={marking}
          onClick={() => void handleMarkApplied()}
          className="text-[11px] text-ink-muted hover:text-ink underline underline-offset-2 disabled:opacity-50"
        >
          {marking ? 'Saving…' : 'Mark applied'}
        </button>
      </div>
    );
  } else {
    cta = (
      <button
        type="button"
        onClick={() => onSelectSlug(platform.platformSlug)}
        className="px-2.5 py-0.5 text-[11px] font-bold rounded-md border border-border-subtle text-ink-muted hover:text-ink hover:border-border transition-colors"
      >
        Setup →
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-md border border-border-subtle bg-surface-subtle hover:bg-surface-card transition-colors">
      <PlatformLogo slug={platform.platformSlug} name={platform.platformName} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-ink-heading">{platform.platformName}</span>
          {badge && (
            <span className={`px-1.5 py-px text-[10px] font-semibold rounded border ${badge.pill}`}>
              {badge.label}
            </span>
          )}
        </div>
        {benefit && (
          <p className="text-xs text-ink-muted truncate">{benefit}</p>
        )}
      </div>
      <div className="shrink-0">{cta}</div>
    </div>
  );
}

type Props = {
  platforms: PlatformPublishResult[];
  accountBySlug: Map<string, PlatformAccountDetail>;
  dealerId: string;
  onDone: () => void;
  onSelectSlug: (slug: string) => void;
};

export function NextBestActionPanel({
  platforms,
  accountBySlug,
  dealerId,
  onDone,
  onSelectSlug,
}: Props) {
  const actionable: PlatformWithConn[] = [];
  for (const platform of platforms) {
    const account = accountBySlug.get(platform.platformSlug);
    if (!account) continue;
    const conn = platformConnectionWithAccount(platform, account);
    if (conn.connection === 'connected') continue;
    const priority = scorePlatform(platform, account, conn);
    if (priority >= 99) continue;
    actionable.push({ platform, account, conn, priority });
  }

  actionable.sort((a, b) => a.priority - b.priority || (a.account.tier ?? 99) - (b.account.tier ?? 99));

  if (!actionable.length) return null;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-ink-muted uppercase tracking-wide">
          Next actions
          <span className="ml-1.5 font-normal normal-case tracking-normal text-ink-faint">
            {actionable.length} platform{actionable.length !== 1 ? 's' : ''} need attention
          </span>
        </p>
      </div>
      <div className="space-y-1.5">
        {actionable.map(item => (
          <ActionRow
            key={item.platform.platformSlug}
            item={item}
            dealerId={dealerId}
            onDone={onDone}
            onSelectSlug={onSelectSlug}
          />
        ))}
      </div>
    </div>
  );
}
