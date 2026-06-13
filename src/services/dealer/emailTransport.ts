import { writeMockEmail } from './mockEmailService.js';
import nodemailer from 'nodemailer';

export type EmailMessage = {
  to:       string;
  subject:  string;
  body:     string;
  payload?: unknown;
};

// ── Transport ─────────────────────────────────────────────────────────────────

/**
 * Routes email delivery based on NODE_ENV:
 *   development / test → writeMockEmail (writes JSON to MOCK_OUTBOX_DIR)
 *   production          → smtpSend when SMTP_ENABLED=true, otherwise mock outbox
 *
 * Accepts an env map so tests can pass synthetic configs without touching process.env.
 */
function smtpEnabled(env: Record<string, string | undefined>): boolean {
  return env['SMTP_ENABLED']?.trim().toLowerCase() === 'true';
}

export async function emailTransport(
  msg: EmailMessage,
  env: Record<string, string | undefined> = process.env
): Promise<void> {
  if (env['NODE_ENV'] === 'production' && smtpEnabled(env)) {
    await smtpSend(msg, env);
  } else {
    await writeMockEmail({
      to:      msg.to,
      subject: msg.subject,
      body:    msg.body,
      payload: msg.payload ?? null,
    });
  }
}

async function smtpSend(
  msg: EmailMessage,
  env: Record<string, string | undefined>
): Promise<void> {
  const host = env['SMTP_HOST']?.trim();
  const port = Number(env['SMTP_PORT']?.trim());
  const user = env['SMTP_USER']?.trim();
  const pass = env['SMTP_PASS'];
  const from = env['SMTP_FROM']?.trim();

  if (!host || !Number.isInteger(port) || port <= 0 || !user || !pass || !from) {
    throw new Error('SMTP transport requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.');
  }

  const secure = env['SMTP_SECURE']?.trim().toLowerCase() === 'true' || port === 465;
  const transporter = env['SMTP_JSON_TRANSPORT']?.trim().toLowerCase() === 'true'
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
  await transporter.sendMail({
    from,
    to:      msg.to,
    subject: msg.subject,
    text:    msg.body,
  });
}
