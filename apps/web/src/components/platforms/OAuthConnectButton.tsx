import { useOAuthConnect } from '@/hooks/useOAuthConnect.ts';

type Props = {
  dealerId: string;
  platformSlug: string;
  providerDisplayName: string;
  isReconnect?: boolean;
  onDone: () => void;
  className?: string;
  label?: string;
};

export function OAuthConnectButton({ dealerId, platformSlug, providerDisplayName, isReconnect, onDone, className = '', label }: Props) {
  const { connecting, connected, connect } = useOAuthConnect(dealerId, platformSlug, onDone);
  const idleLabel = label ?? (isReconnect
    ? `Re-connect ${providerDisplayName}`
    : `Connect ${providerDisplayName}`);

  return (
    <button
      type="button"
      disabled={connecting || connected}
      onClick={e => { e.stopPropagation(); void connect(); }}
      className={`inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-md text-white transition-colors ${
        connected
          ? 'bg-green-500 cursor-default'
          : 'bg-amber-500 hover:bg-amber-600 disabled:opacity-60'
      } ${className}`}
    >
      {connected ? 'Connected ✓' : connecting ? 'Connecting…' : idleLabel}
    </button>
  );
}
