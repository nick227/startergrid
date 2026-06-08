import { useState } from 'react';
import { fetchConnectUrl } from '@/lib/api/sdk.ts';

export function useOAuthConnect(dealerId: string, platformSlug: string, onDone: () => void) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setConnecting(true);
    setConnected(false);
    setError(null);
    try {
      const { authUrl } = await fetchConnectUrl(dealerId, platformSlug);
      const popup = window.open(authUrl, 'oauth_connect', 'width=600,height=700,noopener');
      const poll = setInterval(() => {
        if (popup?.closed) {
          clearInterval(poll);
          setConnecting(false);
          setConnected(true);
          // Brief confirmation window before parent refreshes
          setTimeout(() => {
            setConnected(false);
            onDone();
          }, 1500);
        }
      }, 500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get connect URL');
      setConnecting(false);
    }
  };

  return { connecting, connected, error, connect };
}
