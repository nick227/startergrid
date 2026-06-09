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

      let settled = false;
      const settle = (success: boolean, msg?: string) => {
        if (settled) return;
        settled = true;
        clearInterval(pollTimer);
        window.removeEventListener('message', onMessage);
        if (!success) {
          setError(msg ?? 'Authorization failed');
          setConnecting(false);
          return;
        }
        setConnecting(false);
        setConnected(true);
        setTimeout(() => {
          setConnected(false);
          onDone();
        }, 1500);
      };

      // Primary: postMessage sent by the popup close page
      const onMessage = (evt: MessageEvent) => {
        if (typeof evt.data !== 'object' || evt.data === null) return;
        if (!('success' in evt.data)) return;
        const { success, message } = evt.data as { success: boolean; message: string };
        settle(success, success ? undefined : message);
      };
      window.addEventListener('message', onMessage);

      // Fallback: detect window close (user closed popup manually).
      // We delay settling by 300ms so any in-flight postMessage can arrive first —
      // window.close() in the popup is synchronous but the message event is async.
      const pollTimer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollTimer);
          setTimeout(() => settle(false, 'Window closed before completing authorization'), 300);
        }
      }, 500);

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get connect URL');
      setConnecting(false);
    }
  };

  return { connecting, connected, error, connect };
}
