// Email transport and notification service tests.
//
// Proves that:
//   1. Development/test routes to mock outbox (writes a file)
//   2. Production routes to SMTP path (throws SmtpNotImplementedError)
//   3. SmtpNotImplementedError has the expected shape
//   4. notifyLeadCaptured: transport failure marks notification FAILED
//   5. notifyLeadCaptured: triggering operation does not throw because email failed
//   6. notifyLeadCaptured: no dealer email address marks notification FAILED
//   7. notifyLeadCaptured: successful transport marks notification SENT with deliveredAt

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { PrismaClient } from '@prisma/client';
import { emailTransport, SmtpNotImplementedError, type EmailMessage } from '../services/dealer/emailTransport.js';
import { notifyLeadCaptured } from '../services/dealer/dealerNotificationService.js';

// ── Fixture ───────────────────────────────────────────────────────────────────

const SAMPLE_MSG: EmailMessage = {
  to:      'dealer@example.com',
  subject: 'Test notification',
  body:    'A lead was received.',
};

const PROD_ENV: Record<string, string> = {
  NODE_ENV:  'production',
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '587',
  SMTP_USER: 'user@example.com',
  SMTP_PASS: 'secret',
  SMTP_FROM: 'no-reply@example.com',
};

// ── emailTransport — dev/test routing ────────────────────────────────────────

describe('emailTransport — development', () => {
  it('routes to mock outbox and writes a file (NODE_ENV=development)', async () => {
    const tmpDir = path.join(os.tmpdir(), `et-dev-${Date.now()}`);
    const prevDir = process.env['MOCK_OUTBOX_DIR'];
    process.env['MOCK_OUTBOX_DIR'] = tmpDir;
    try {
      await emailTransport(SAMPLE_MSG, { NODE_ENV: 'development' });
      const files = await fs.readdir(tmpDir);
      assert.ok(files.length > 0, 'mock outbox must contain at least one file after transport call');
    } finally {
      if (prevDir === undefined) delete process.env['MOCK_OUTBOX_DIR'];
      else process.env['MOCK_OUTBOX_DIR'] = prevDir;
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('routes to mock outbox (NODE_ENV=test)', async () => {
    const tmpDir = path.join(os.tmpdir(), `et-test-${Date.now()}`);
    const prevDir = process.env['MOCK_OUTBOX_DIR'];
    process.env['MOCK_OUTBOX_DIR'] = tmpDir;
    try {
      await emailTransport(SAMPLE_MSG, { NODE_ENV: 'test' });
      const files = await fs.readdir(tmpDir);
      assert.ok(files.length > 0, 'mock outbox must contain a file for NODE_ENV=test');
    } finally {
      if (prevDir === undefined) delete process.env['MOCK_OUTBOX_DIR'];
      else process.env['MOCK_OUTBOX_DIR'] = prevDir;
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('mock outbox file contains the message subject in its content', async () => {
    const tmpDir = path.join(os.tmpdir(), `et-content-${Date.now()}`);
    const prevDir = process.env['MOCK_OUTBOX_DIR'];
    process.env['MOCK_OUTBOX_DIR'] = tmpDir;
    try {
      const msg: EmailMessage = { to: 'a@b.com', subject: 'Lead for PR-001', body: 'Details here.' };
      await emailTransport(msg, { NODE_ENV: 'development' });
      const [file] = await fs.readdir(tmpDir);
      const content = await fs.readFile(path.join(tmpDir, file!), 'utf8');
      const parsed = JSON.parse(content);
      assert.equal(parsed.subject, 'Lead for PR-001');
      assert.equal(parsed.to,      'a@b.com');
    } finally {
      if (prevDir === undefined) delete process.env['MOCK_OUTBOX_DIR'];
      else process.env['MOCK_OUTBOX_DIR'] = prevDir;
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});

// ── emailTransport — production routing ──────────────────────────────────────

describe('emailTransport — production', () => {
  it('uses mock outbox by default in production (SMTP_ENABLED unset)', async () => {
    const tmpDir = path.join(os.tmpdir(), `et-prod-default-${Date.now()}`);
    const prevDir = process.env['MOCK_OUTBOX_DIR'];
    process.env['MOCK_OUTBOX_DIR'] = tmpDir;
    try {
      await emailTransport(SAMPLE_MSG, { NODE_ENV: 'production' });
      const files = await fs.readdir(tmpDir);
      assert.ok(files.length > 0, 'production without SMTP_ENABLED must use mock outbox');
    } finally {
      if (prevDir === undefined) delete process.env['MOCK_OUTBOX_DIR'];
      else process.env['MOCK_OUTBOX_DIR'] = prevDir;
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('throws SmtpNotImplementedError when SMTP_ENABLED=true (SMTP not yet wired)', async () => {
    await assert.rejects(
      () => emailTransport(SAMPLE_MSG, { ...PROD_ENV, SMTP_ENABLED: 'true' }),
      SmtpNotImplementedError
    );
  });

  it('does not write to mock outbox when SMTP_ENABLED=true', async () => {
    const tmpDir = path.join(os.tmpdir(), `et-prod-${Date.now()}`);
    const prevDir = process.env['MOCK_OUTBOX_DIR'];
    process.env['MOCK_OUTBOX_DIR'] = tmpDir;
    try {
      await emailTransport(SAMPLE_MSG, { ...PROD_ENV, SMTP_ENABLED: 'true' }).catch(() => {});
      let files: string[] = [];
      try { files = await fs.readdir(tmpDir); } catch { /* dir may not exist */ }
      assert.equal(files.length, 0, 'production must not write to mock outbox');
    } finally {
      if (prevDir === undefined) delete process.env['MOCK_OUTBOX_DIR'];
      else process.env['MOCK_OUTBOX_DIR'] = prevDir;
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});

// ── SmtpNotImplementedError ───────────────────────────────────────────────────

describe('SmtpNotImplementedError', () => {
  it('is instanceof Error', () => {
    assert.ok(new SmtpNotImplementedError() instanceof Error);
  });

  it('name is SmtpNotImplementedError', () => {
    assert.equal(new SmtpNotImplementedError().name, 'SmtpNotImplementedError');
  });

  it('message includes "not yet implemented"', () => {
    assert.ok(new SmtpNotImplementedError().message.toLowerCase().includes('not yet implemented'));
  });
});

// ── notifyLeadCaptured — non-blocking transport contract ─────────────────────

// Minimal Prisma mock for notification tests.
function makePrisma(opts: {
  dealerEmail?: string | null;
  createFails?: boolean;
  updateFails?: boolean;
} = {}): { prisma: PrismaClient; updates: Array<{ id: string; data: Record<string, unknown> }> } {
  const updates: Array<{ id: string; data: Record<string, unknown> }> = [];

  const prisma = {
    dealerNotification: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (opts.createFails) throw new Error('DB create failed');
        return { id: 'notif-001', ...data };
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        if (opts.updateFails) throw new Error('DB update failed');
        updates.push({ id: where.id, data });
        return { id: where.id, ...data };
      },
    },
    dealershipProfile: {
      findUnique: async () => {
        if (opts.dealerEmail === null) return null;
        return {
          id:             'dealer-001',
          legalName:      'Prairie Ridge Motors LLC',
          dbaName:        'Prairie Ridge Motors',
          primaryContact: opts.dealerEmail === undefined
            ? { email: 'dealer@example.com', phone: '+13125550100' }
            : { email: opts.dealerEmail },
        };
      },
    },
  } as unknown as PrismaClient;

  return { prisma, updates };
}

describe('notifyLeadCaptured — transport success', () => {
  it('marks notification SENT when transport succeeds', async () => {
    const { prisma, updates } = makePrisma();
    const transport = async (_msg: EmailMessage) => { /* success */ };

    await notifyLeadCaptured(prisma, 'dealer-001', 'lead-001', 'consumer-marketplace',
      { name: 'Alice', email: 'alice@example.com', stockNumber: 'PR-001' }, transport);

    const sent = updates.find(u => u.data['deliveryStatus'] === 'SENT');
    assert.ok(sent, 'notification must be marked SENT after successful transport');
    assert.ok(sent.data['deliveredAt'] instanceof Date, 'deliveredAt must be set on SENT');
  });

  it('does not throw when transport succeeds', async () => {
    const { prisma } = makePrisma();
    const transport = async (_msg: EmailMessage) => { /* success */ };
    await assert.doesNotReject(() =>
      notifyLeadCaptured(prisma, 'dealer-001', 'lead-001', 'dealer-storefront',
        { name: 'Bob', stockNumber: 'PR-002' }, transport)
    );
  });
});

describe('notifyLeadCaptured — transport failure (non-blocking)', () => {
  it('does not re-throw when transport throws', async () => {
    const { prisma } = makePrisma();
    const failingTransport = async (_msg: EmailMessage): Promise<void> => {
      throw new Error('SMTP connection refused');
    };

    await assert.doesNotReject(() =>
      notifyLeadCaptured(prisma, 'dealer-001', 'lead-001', 'consumer-marketplace',
        { name: 'Carol', stockNumber: 'PR-003' }, failingTransport)
    );
  });

  it('marks notification FAILED when transport throws', async () => {
    const { prisma, updates } = makePrisma();
    const failingTransport = async (_msg: EmailMessage): Promise<void> => {
      throw new Error('Connection refused');
    };

    await notifyLeadCaptured(prisma, 'dealer-001', 'lead-001', 'consumer-marketplace',
      { stockNumber: 'PR-004' }, failingTransport);

    const failed = updates.find(u => u.data['deliveryStatus'] === 'FAILED');
    assert.ok(failed, 'notification must be marked FAILED after transport failure');
  });
});

describe('notifyLeadCaptured — missing dealer email', () => {
  it('marks notification FAILED when no dealer email configured', async () => {
    const { prisma, updates } = makePrisma({ dealerEmail: '' });
    const transport = async (_msg: EmailMessage) => { /* should not be called */ };

    await notifyLeadCaptured(prisma, 'dealer-001', 'lead-001', 'consumer-marketplace',
      { stockNumber: 'PR-005' }, transport);

    const failed = updates.find(u => u.data['deliveryStatus'] === 'FAILED');
    assert.ok(failed, 'notification must be FAILED when no dealer email');
  });

  it('does not throw when dealer cannot be found', async () => {
    const { prisma } = makePrisma({ dealerEmail: null });
    const transport = async (_msg: EmailMessage) => {};
    await assert.doesNotReject(() =>
      notifyLeadCaptured(prisma, 'dealer-001', 'lead-001', 'consumer-marketplace', {}, transport)
    );
  });
});

describe('notifyLeadCaptured — outer failure handling', () => {
  it('does not throw even when notification DB create fails', async () => {
    const { prisma } = makePrisma({ createFails: true });
    const transport = async (_msg: EmailMessage) => {};
    await assert.doesNotReject(() =>
      notifyLeadCaptured(prisma, 'dealer-001', 'lead-001', 'consumer-marketplace',
        { name: 'Dave' }, transport)
    );
  });

  it('transport is never called when DB create fails', async () => {
    const { prisma } = makePrisma({ createFails: true });
    let transportCalled = false;
    const transport = async (_msg: EmailMessage) => { transportCalled = true; };
    await notifyLeadCaptured(prisma, 'dealer-001', 'lead-001', 'consumer-marketplace',
      { name: 'Eve' }, transport);
    assert.equal(transportCalled, false);
  });
});
