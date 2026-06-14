import crypto from 'crypto';

export type WebhookConfig = { url: string; secret?: string };

export type WebhookPayload = Record<string, unknown>;

export async function sendWebhook(config: WebhookConfig, payload: WebhookPayload): Promise<void> {
  const body = JSON.stringify(payload);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent':   'DealerPortal-Webhook/1.0',
  };

  if (config.secret) {
    const sig = crypto
      .createHmac('sha256', config.secret)
      .update(body)
      .digest('hex');
    headers['X-Dealer-Signature'] = `sha256=${sig}`;
  }

  const res = await fetch(config.url, { method: 'POST', headers, body });
  if (!res.ok) {
    throw new Error(`Webhook POST to ${config.url} failed: HTTP ${res.status}`);
  }
}
