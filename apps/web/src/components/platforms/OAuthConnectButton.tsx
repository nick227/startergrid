import { useOAuthConnect } from '@/hooks/useOAuthConnect.ts';

type Props = {
  dealerId: string;
  platformSlug: string;
  providerDisplayName: string;
  isReconnect?: boolean;
  onDone: () => void;
};

export function OAuthConnectButton({ dealerId, platformSlug, providerDisplayName, isReconnect, onDone }: Props) {
  const { connecting, connected, connect } = useOAuthConnect(dealerId, platformSlug, onDone);
  const idleLabel = isReconnect
    ? `Re-connect ${providerDisplayName} →`
    : `Connect ${providerDisplayName} →`;

  return (
    <button
      type="button"
      disabled={connecting || connected}
      onClick={e => { e.stopPropagation(); void connect(); }}
      className={`shrink-0 px-2.5 py-0.5 text-[11px] font-bold rounded-md text-white transition-colors ${
        connected
          ? 'bg-green-500 cursor-default'
          : 'bg-amber-500 hover:bg-amber-600 disabled:opacity-60'
      }`}
    >
      {connected ? 'Connected ✓' : connecting ? 'Connecting…' : idleLabel}
    </button>
  );
}
