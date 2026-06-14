export type DiscordConfig = { webhookUrl: string };

export type DiscordLeadPayload = {
  dealerName:   string;
  vehicleRef:   string;
  platformSlug: string;
  leadId:       string;
  contact: {
    name?:    string | null;
    email?:   string | null;
    phone?:   string | null;
    message?: string | null;
  };
};

const ORANGE = 0xea580c;

export async function sendDiscord(config: DiscordConfig, payload: DiscordLeadPayload): Promise<void> {
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  if (payload.contact.name)    fields.push({ name: 'Name',    value: payload.contact.name,    inline: true });
  if (payload.contact.email)   fields.push({ name: 'Email',   value: payload.contact.email,   inline: true });
  if (payload.contact.phone)   fields.push({ name: 'Phone',   value: payload.contact.phone,   inline: true });
  if (payload.contact.message) fields.push({ name: 'Message', value: payload.contact.message, inline: false });

  const body = {
    embeds: [{
      title:       `New lead — ${payload.vehicleRef}`,
      color:       ORANGE,
      fields:      [
        { name: 'Dealer',   value: payload.dealerName,   inline: true },
        { name: 'Platform', value: payload.platformSlug, inline: true },
        ...fields,
      ],
      footer:     { text: `Lead ID: ${payload.leadId}` },
      timestamp:  new Date().toISOString(),
    }],
  };

  const res = await fetch(config.webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Discord webhook failed: HTTP ${res.status} ${detail}`);
  }
}
