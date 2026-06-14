import { useState, useEffect } from 'react';
import {
  fetchNotificationChannels,
  updateNotificationChannels,
  type NotificationChannelsConfig,
  type AutoResponseConfig,
} from '@/lib/api/sdk.ts';
import { InfoButton } from '@/components/docs/index.ts';

type Props = { dealerId: string };

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const EMPTY_AUTO_RESPONSE: AutoResponseConfig = {
  enabled:       false,
  emailEnabled:  true,
  smsEnabled:    true,
  fromName:      '',
  emailTemplate: '',
  smsTemplate:   '',
};

const EMPTY: NotificationChannelsConfig = {
  email:        { enabled: true },
  webhook:      { url: '' },
  discord:      { webhookUrl: '' },
  telegram:     { botToken: '', chatId: '' },
  sms:          { phone: '' },
  autoResponse: { ...EMPTY_AUTO_RESPONSE },
};

function merge(saved: NotificationChannelsConfig): Required<NotificationChannelsConfig> {
  return {
    email:        { enabled: saved.email?.enabled !== false, ...saved.email },
    webhook:      { url: '', secret: '', ...saved.webhook },
    discord:      { webhookUrl: '', ...saved.discord },
    telegram:     { botToken: '', chatId: '', ...saved.telegram },
    sms:          { phone: '', ...saved.sms },
    autoResponse: { ...EMPTY_AUTO_RESPONSE, ...saved.autoResponse },
  };
}

function toSavePayload(local: Required<NotificationChannelsConfig>): NotificationChannelsConfig {
  const out: NotificationChannelsConfig = {};
  out.email = { enabled: local.email.enabled };
  if (local.webhook.url.trim()) {
    out.webhook = { url: local.webhook.url.trim() };
    if (local.webhook.secret?.trim()) out.webhook.secret = local.webhook.secret.trim();
  }
  if (local.discord.webhookUrl.trim()) {
    out.discord = { webhookUrl: local.discord.webhookUrl.trim() };
  }
  if (local.telegram.botToken.trim() && local.telegram.chatId.trim()) {
    out.telegram = { botToken: local.telegram.botToken.trim(), chatId: local.telegram.chatId.trim() };
  }
  if (local.sms.phone.trim()) {
    out.sms = { phone: local.sms.phone.trim() };
  }
  const ar = local.autoResponse;
  out.autoResponse = {
    enabled:       ar.enabled,
    emailEnabled:  ar.emailEnabled,
    smsEnabled:    ar.smsEnabled,
    fromName:      ar.fromName?.trim() || undefined,
    emailTemplate: ar.emailTemplate?.trim() || undefined,
    smsTemplate:   ar.smsTemplate?.trim() || undefined,
  };
  return out;
}

export function NotificationChannelsPanel({ dealerId }: Props) {
  const [open, setOpen]       = useState(false);
  const [cfg, setCfg]         = useState<Required<NotificationChannelsConfig>>(merge(EMPTY));
  const [saveState, setSave]  = useState<SaveState>('idle');
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetchNotificationChannels(dealerId)
      .then(saved => setCfg(merge(saved)))
      .catch(err => setLoadErr(String(err)));
  }, [open, dealerId]);

  async function handleSave() {
    setSave('saving');
    try {
      const saved = await updateNotificationChannels(dealerId, toSavePayload(cfg));
      setCfg(merge(saved));
      setSave('saved');
      setTimeout(() => setSave('idle'), 2000);
    } catch {
      setSave('error');
    }
  }

  function setEmail(patch: Partial<typeof cfg.email>)             { setCfg(c => ({ ...c, email:        { ...c.email,        ...patch } })); }
  function setWebhook(patch: Partial<typeof cfg.webhook>)         { setCfg(c => ({ ...c, webhook:      { ...c.webhook,      ...patch } })); }
  function setDiscord(patch: Partial<typeof cfg.discord>)         { setCfg(c => ({ ...c, discord:      { ...c.discord,      ...patch } })); }
  function setTelegram(patch: Partial<typeof cfg.telegram>)       { setCfg(c => ({ ...c, telegram:     { ...c.telegram,     ...patch } })); }
  function setSms(patch: Partial<typeof cfg.sms>)                 { setCfg(c => ({ ...c, sms:          { ...c.sms,          ...patch } })); }
  function setAutoResponse(patch: Partial<typeof cfg.autoResponse>) { setCfg(c => ({ ...c, autoResponse: { ...c.autoResponse, ...patch } })); }

  return (
    <div className="rounded-xl border border-silver-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <div>
            <p className="text-sm font-semibold text-ink-heading">Notification channels</p>
            <p className="text-xs text-ink-muted">Configure where lead alerts are delivered</p>
          </div>
          <InfoButton docId="connections/lead-notifications" />
        </div>
        <span className="text-xs text-ink-faint">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-silver-200 px-4 py-4 space-y-5">
          {loadErr && (
            <p className="text-xs text-red-600">{loadErr}</p>
          )}

          {/* Email */}
          <section>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-ink-heading">Email</p>
                <InfoButton docId="connections/email-notifications" />
              </div>
              <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={cfg.email.enabled !== false}
                  onChange={e => setEmail({ enabled: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-silver-300"
                />
                Enabled
              </label>
            </div>
            <p className="mt-0.5 text-xs text-ink-faint">Sends to the primary contact email on your dealer profile.</p>
          </section>

          {/* Webhook */}
          <section className="space-y-2">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-ink-heading">Webhook</p>
              <InfoButton docId="connections/webhook" />
            </div>
            <p className="text-xs text-ink-faint">POST JSON to any HTTPS URL — works with Zapier, Make, Slack, Discord, or custom endpoints.</p>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-muted">URL</span>
              <input
                type="url"
                placeholder="https://webhook.site/your-id"
                value={cfg.webhook.url}
                onChange={e => setWebhook({ url: e.target.value })}
                className="field-input text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-muted">Signing secret <span className="font-normal text-ink-faint">(optional — adds HMAC-SHA256 header)</span></span>
              <input
                type="password"
                placeholder="secret"
                value={cfg.webhook.secret ?? ''}
                onChange={e => setWebhook({ secret: e.target.value })}
                className="field-input text-sm"
              />
            </label>
          </section>

          {/* Discord */}
          <section className="space-y-2">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-ink-heading">Discord</p>
              <InfoButton docId="connections/discord" />
            </div>
            <p className="text-xs text-ink-faint">
              In Discord: go to your channel settings → Integrations → Webhooks → New Webhook → Copy URL.
            </p>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-muted">Webhook URL</span>
              <input
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={cfg.discord.webhookUrl}
                onChange={e => setDiscord({ webhookUrl: e.target.value })}
                className="field-input text-sm"
              />
            </label>
          </section>

          {/* Telegram */}
          <section className="space-y-2">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-ink-heading">Telegram</p>
              <InfoButton docId="connections/telegram" />
            </div>
            <p className="text-xs text-ink-faint">
              Create a bot via <span className="font-mono">@BotFather</span>, then message it to get your chat ID via <span className="font-mono">@userinfobot</span>.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-ink-muted">Bot token</span>
                <input
                  type="password"
                  placeholder="123456:ABC-..."
                  value={cfg.telegram.botToken}
                  onChange={e => setTelegram({ botToken: e.target.value })}
                  className="field-input text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-ink-muted">Chat ID</span>
                <input
                  type="text"
                  placeholder="-100123456789"
                  value={cfg.telegram.chatId}
                  onChange={e => setTelegram({ chatId: e.target.value })}
                  className="field-input text-sm"
                />
              </label>
            </div>
          </section>

          {/* SMS */}
          <section className="space-y-2">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-ink-heading">SMS</p>
              <InfoButton docId="connections/sms" />
            </div>
            <p className="text-xs text-ink-faint">Sends via Twilio. Enter phone in E.164 format.</p>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-muted">Phone number</span>
              <input
                type="tel"
                placeholder="+15551234567"
                value={cfg.sms.phone}
                onChange={e => setSms({ phone: e.target.value })}
                className="field-input text-sm"
              />
            </label>
          </section>

          {/* Auto-Response */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-ink-heading">Auto-Response to buyers</p>
                <InfoButton docId="connections/auto-response" />
              </div>
              <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={cfg.autoResponse.enabled}
                  onChange={e => setAutoResponse({ enabled: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-silver-300"
                />
                Enabled
              </label>
            </div>
            <p className="text-xs text-ink-faint">
              When enabled, buyers receive a personalised acknowledgment message within seconds of submitting an inquiry. Opt-in — disabled by default.
            </p>

            {cfg.autoResponse.enabled && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 space-y-3">
                <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">Active — buyers will receive messages</p>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cfg.autoResponse.emailEnabled !== false}
                      onChange={e => setAutoResponse({ emailEnabled: e.target.checked })}
                      className="h-3.5 w-3.5 rounded border-silver-300"
                    />
                    Email buyers
                  </label>
                  <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cfg.autoResponse.smsEnabled !== false}
                      onChange={e => setAutoResponse({ smsEnabled: e.target.checked })}
                      className="h-3.5 w-3.5 rounded border-silver-300"
                    />
                    SMS buyers
                  </label>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-ink-muted">Display name <span className="font-normal text-ink-faint">(shown in message — defaults to dealership name)</span></span>
                  <input
                    type="text"
                    placeholder="e.g. Riverside Auto Group"
                    value={cfg.autoResponse.fromName ?? ''}
                    onChange={e => setAutoResponse({ fromName: e.target.value })}
                    className="field-input text-sm"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-ink-muted">
                    Email message <span className="font-normal text-ink-faint">(optional — use {'{name}'}, {'{vehicle}'}, {'{dealer}'})</span>
                  </span>
                  <textarea
                    rows={3}
                    placeholder={`Hi {name},\n\nThanks for reaching out about the {vehicle}. We'll be in touch shortly.\n\n{dealer}`}
                    value={cfg.autoResponse.emailTemplate ?? ''}
                    onChange={e => setAutoResponse({ emailTemplate: e.target.value })}
                    className="field-input text-sm resize-none"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-ink-muted">
                    SMS message <span className="font-normal text-ink-faint">(optional — keep under 160 chars)</span>
                  </span>
                  <input
                    type="text"
                    placeholder="Hi {name}, thanks for your interest in the {vehicle}. We'll be in touch. — {dealer}"
                    value={cfg.autoResponse.smsTemplate ?? ''}
                    onChange={e => setAutoResponse({ smsTemplate: e.target.value })}
                    className="field-input text-sm"
                  />
                  {cfg.autoResponse.smsTemplate && (
                    <span className={`text-[11px] ${cfg.autoResponse.smsTemplate.length > 160 ? 'text-red-600' : 'text-ink-faint'}`}>
                      {cfg.autoResponse.smsTemplate.length}/160
                    </span>
                  )}
                </label>
              </div>
            )}
          </section>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saveState === 'saving'}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {saveState === 'saving' ? 'Saving…' : 'Save channels'}
            </button>
            {saveState === 'saved' && (
              <span className="text-xs font-medium text-emerald-600">Saved</span>
            )}
            {saveState === 'error' && (
              <span className="text-xs font-medium text-red-600">Save failed — try again</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
