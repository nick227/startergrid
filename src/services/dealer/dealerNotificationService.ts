import type { PrismaClient, Prisma } from '@prisma/client';
import { fanoutLeadNotification, type NotificationChannelsConfig, type LeadNotificationPayload } from './notificationFanout.js';
import { sendBuyerAutoResponse } from './buyerAutoResponseService.js';

type FanoutFn = (
  channels: NotificationChannelsConfig,
  email: string | null,
  payload: LeadNotificationPayload,
) => ReturnType<typeof fanoutLeadNotification>;

/**
 * Creates a DealerNotification row and fans out to every configured channel
 * (email, webhook, Telegram, SMS) in parallel.
 *
 * Non-blocking contract: never re-throws. Lead acceptance is already committed
 * when this is called — a downstream outage must not erase the buyer inquiry.
 */
export async function notifyLeadCaptured(
  prisma:         PrismaClient,
  dealershipId:   string,
  leadId:         string,
  platformSlug:   string,
  contactSummary: { name?: string | null; email?: string | null; phone?: string | null; message?: string | null; stockNumber?: string },
  _fanout:        FanoutFn = fanoutLeadNotification,
): Promise<void> {
  try {
    const notification = await prisma.dealerNotification.create({
      data: {
        dealershipId,
        type:           'LEAD_CAPTURED',
        deliveryStatus: 'PENDING',
        payload: {
          leadId,
          platformSlug,
          contact: contactSummary,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    const dealer = await prisma.dealershipProfile.findUnique({
      where:  { id: dealershipId },
      select: { primaryContact: true, legalName: true, dbaName: true, notificationChannels: true },
    });

    const contact     = dealer?.primaryContact as Record<string, string> | null | undefined;
    const toEmail     = contact?.['email']?.trim() || null;
    const dealerName  = (dealer?.dbaName || dealer?.legalName) ?? 'Dealer';
    const vehicleRef  = contactSummary.stockNumber ? `Stock #${contactSummary.stockNumber}` : 'a vehicle';

    const rawChannels = dealer?.notificationChannels;
    const channels: NotificationChannelsConfig =
      rawChannels && typeof rawChannels === 'object' && !Array.isArray(rawChannels)
        ? (rawChannels as NotificationChannelsConfig)
        : {};

    const results = await _fanout(channels, toEmail, {
      leadId,
      platformSlug,
      dealerName,
      vehicleRef,
      contact: {
        name:    contactSummary.name,
        email:   contactSummary.email,
        phone:   contactSummary.phone,
        message: contactSummary.message,
      },
    });

    const anySent = results.some(r => r.ok);
    for (const r of results) {
      if (!r.ok) {
        console.error(`[notifyLeadCaptured] channel ${r.channel} failed: ${r.error}`);
      }
    }

    await prisma.dealerNotification.update({
      where: { id: notification.id },
      data:  {
        deliveryStatus: results.length === 0 ? 'FAILED'
          : anySent ? 'SENT'
          : 'FAILED',
        deliveredAt: anySent ? new Date() : undefined,
      },
    }).catch(() => {});

    // Opt-in auto-response to buyer — non-blocking, never re-throws
    if (channels.autoResponse?.enabled) {
      sendBuyerAutoResponse(prisma, {
        leadId,
        dealershipId,
        dealerName,
        vehicleRef,
        contact: {
          name:  contactSummary.name,
          email: contactSummary.email,
          phone: contactSummary.phone,
        },
        config: channels.autoResponse,
      }).catch(err => {
        console.error('[notifyLeadCaptured] auto-response failed:', err instanceof Error ? err.message : String(err));
      });
    }
  } catch (err) {
    console.error(
      '[notifyLeadCaptured] notification setup failed:',
      err instanceof Error ? err.message : String(err),
    );
  }
}
