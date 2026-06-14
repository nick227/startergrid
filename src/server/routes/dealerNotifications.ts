import type { FastifyInstance } from 'fastify';
import type { PrismaClient, Prisma } from '@prisma/client';
import { requireDealerAccess } from '../security.js';
import type { NotificationChannelsConfig } from '../../services/dealer/notificationFanout.js';

type DealerParams = { dealershipId: string };

const ALLOWED_CHANNEL_KEYS = new Set(['email', 'webhook', 'telegram', 'sms']);

function sanitizeChannels(raw: unknown): NotificationChannelsConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: NotificationChannelsConfig = {};
  const input = raw as Record<string, unknown>;

  if (input['email'] && typeof input['email'] === 'object') {
    const e = input['email'] as Record<string, unknown>;
    out.email = { enabled: e['enabled'] !== false };
  }
  if (input['webhook'] && typeof input['webhook'] === 'object') {
    const w = input['webhook'] as Record<string, unknown>;
    if (typeof w['url'] === 'string' && w['url'].startsWith('https://')) {
      out.webhook = {
        url:    w['url'],
        secret: typeof w['secret'] === 'string' ? w['secret'] : undefined,
      };
    }
  }
  if (input['telegram'] && typeof input['telegram'] === 'object') {
    const t = input['telegram'] as Record<string, unknown>;
    if (typeof t['botToken'] === 'string' && typeof t['chatId'] === 'string') {
      out.telegram = { botToken: t['botToken'], chatId: t['chatId'] };
    }
  }
  if (input['sms'] && typeof input['sms'] === 'object') {
    const s = input['sms'] as Record<string, unknown>;
    if (typeof s['phone'] === 'string' && s['phone'].startsWith('+')) {
      out.sms = { phone: s['phone'] };
    }
  }
  if (input['discord'] && typeof input['discord'] === 'object') {
    const d = input['discord'] as Record<string, unknown>;
    if (typeof d['webhookUrl'] === 'string' && d['webhookUrl'].startsWith('https://discord.com/api/webhooks/')) {
      out.discord = { webhookUrl: d['webhookUrl'] };
    }
  }
  if (input['autoResponse'] && typeof input['autoResponse'] === 'object') {
    const ar = input['autoResponse'] as Record<string, unknown>;
    out.autoResponse = {
      enabled:       ar['enabled'] === true,
      emailEnabled:  ar['emailEnabled'] !== false,
      smsEnabled:    ar['smsEnabled'] !== false,
      fromName:      typeof ar['fromName']      === 'string' ? ar['fromName'].slice(0, 120)      : undefined,
      emailTemplate: typeof ar['emailTemplate'] === 'string' ? ar['emailTemplate'].slice(0, 2000) : undefined,
      smsTemplate:   typeof ar['smsTemplate']   === 'string' ? ar['smsTemplate'].slice(0, 320)    : undefined,
    };
  }
  void ALLOWED_CHANNEL_KEYS;
  return out;
}

export function registerDealerNotificationsRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // GET /api/dealers/:dealershipId/notifications
  // Returns notifications for this dealership, most recent first.
  // deliveryStatus reflects email delivery (PENDING | SENT | FAILED) — this
  // route is the operator read surface regardless of email outcome.
  app.get<{ Params: DealerParams; Querystring: { limit?: string; type?: string } }>(
    '/api/dealers/:dealershipId/notifications',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const limit = Math.min(200, Math.max(1, parseInt(request.query.limit ?? '50', 10) || 50));
      const type = request.query.type || undefined;

      const notifications = await prisma.dealerNotification.findMany({
        where: {
          dealershipId,
          ...(type ? { type } : {}),
        },
        select: {
          id:             true,
          type:           true,
          payload:        true,
          deliveryStatus: true,
          deliveredAt:    true,
          createdAt:      true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return reply.send({ notifications, total: notifications.length });
    }
  );

  // GET /api/dealers/:dealershipId/notification-channels
  app.get<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/notification-channels',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const dealer = await prisma.dealershipProfile.findUnique({
        where:  { id: dealershipId },
        select: { notificationChannels: true },
      });
      if (!dealer) return reply.status(404).send({ error: 'Dealer not found' });

      return reply.send({ channels: dealer.notificationChannels ?? {} });
    }
  );

  // PATCH /api/dealers/:dealershipId/notification-channels
  app.patch<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/notification-channels',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const channels = sanitizeChannels(request.body);

      await prisma.dealershipProfile.update({
        where: { id: dealershipId },
        data:  { notificationChannels: channels as unknown as Prisma.InputJsonValue },
      });

      return reply.send({ channels });
    }
  );
}
