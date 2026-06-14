// Twilio REST API — no SDK, just fetch.
// Falls back to console.log when TWILIO_* env vars are absent (dev / no account yet).

export async function sendSms(to: string, body: string): Promise<void> {
  const accountSid = process.env['TWILIO_ACCOUNT_SID']?.trim();
  const authToken  = process.env['TWILIO_AUTH_TOKEN']?.trim();
  const fromNumber = process.env['TWILIO_FROM_NUMBER']?.trim();

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[SMS mock] To: ${to}\n${body}`);
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: fromNumber, Body: body });
  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(`Twilio SMS failed: ${detail.message ?? `HTTP ${res.status}`}`);
  }
}
