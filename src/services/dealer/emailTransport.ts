import { writeMockEmail } from './mockEmailService.js';

export type EmailMessage = {
  to:       string;
  subject:  string;
  body:     string;
  payload?: unknown;
};

// ── Error types ───────────────────────────────────────────────────────────────

export class SmtpNotImplementedError extends Error {
  constructor() {
    super(
      'SMTP transport is not yet implemented. ' +
      'Wire in a real SMTP library (e.g. nodemailer) to enable production email delivery.'
    );
    this.name = 'SmtpNotImplementedError';
  }
}

// ── Transport ─────────────────────────────────────────────────────────────────

/**
 * Routes email delivery based on NODE_ENV:
 *   development / test → writeMockEmail (writes JSON to MOCK_OUTBOX_DIR)
 *   production          → smtpSend (reads SMTP_* env vars; throws SmtpNotImplementedError
 *                         until a real SMTP library is wired in)
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

// ── SMTP placeholder (production) ─────────────────────────────────────────────

async function smtpSend(
  _msg: EmailMessage,
  _env: Record<string, string | undefined>
): Promise<void> {
  // SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM are validated at
  // server startup by validateEnv() — they will be present and non-empty here.
  //
  // TODO: replace this throw with a real nodemailer (or equivalent) send call:
  //
  //   const transporter = nodemailer.createTransport({
  //     host: _env['SMTP_HOST'],
  //     port: Number(_env['SMTP_PORT']),
  //     auth: { user: _env['SMTP_USER'], pass: _env['SMTP_PASS'] },
  //   });
  //   await transporter.sendMail({
  //     from:    _env['SMTP_FROM'],
  //     to:      _msg.to,
  //     subject: _msg.subject,
  //     text:    _msg.body,
  //   });
  throw new SmtpNotImplementedError();
}
