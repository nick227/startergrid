import type { PrismaClient, Prisma } from '@prisma/client';
import { emailTransport, type EmailMessage } from './emailTransport.js';

/**
 * Creates a DealerNotification row and attempts to send an email to the dealer's
 * primary contact address.
 *
 * Non-blocking contract: this function never re-throws. The triggering business
 * operation (lead capture) is already committed when this is called. Any failure
 * (DB write, missing dealer email, transport error) is logged and recorded as
 * deliveryStatus FAILED, but does not propagate to the caller.
 *
 * @param transport  Injected email transport — defaults to emailTransport. Pass a
 *                   custom function in tests to avoid I/O and control outcomes.
 */
export async function notifyLeadCaptured(
  prisma:         PrismaClient,
  dealershipId:   string,
  leadId:         string,
  platformSlug:   string,
  contactSummary: { name?: string | null; email?: string | null; stockNumber?: string },
  transport:      (msg: EmailMessage) => Promise<void> = emailTransport,
): Promise<void> {
  try {
    // Create notification row — deliveryStatus starts PENDING.
    const notification = await prisma.dealerNotification.create({
      data: {
        dealershipId,
        type:          'LEAD_CAPTURED',
        deliveryStatus: 'PENDING',
        payload: {
          leadId,
          platformSlug,
          contact: contactSummary,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // Resolve dealer's primary contact email.
    const dealer = await prisma.dealershipProfile.findUnique({
      where:  { id: dealershipId },
      select: { primaryContact: true, legalName: true, dbaName: true },
    });
    const contact    = dealer?.primaryContact as Record<string, string> | null | undefined;
    const toEmail    = contact?.['email']?.trim() || null;
    const dealerName = (dealer?.dbaName || dealer?.legalName) ?? 'Dealer';

    if (!toEmail) {
      // No email address configured — cannot deliver; mark FAILED.
      await prisma.dealerNotification.update({
        where: { id: notification.id },
        data:  { deliveryStatus: 'FAILED' },
      }).catch(() => {});
      return;
    }

    const vehicleRef = contactSummary.stockNumber
      ? `Stock #${contactSummary.stockNumber}`
      : 'a vehicle';
    const subject = `New lead — ${vehicleRef} (${platformSlug})`;
    const body = [
      `A new lead was received for ${dealerName}.`,
      '',
      `Platform: ${platformSlug}`,
      `Vehicle:  ${vehicleRef}`,
      contactSummary.name  ? `Name:     ${contactSummary.name}`  : null,
      contactSummary.email ? `Email:    ${contactSummary.email}` : null,
      `Lead ID:  ${leadId}`,
    ].filter(Boolean).join('\n');

    try {
      await transport({ to: toEmail, subject, body, payload: { leadId, platformSlug, contactSummary } });
      await prisma.dealerNotification.update({
        where: { id: notification.id },
        data:  { deliveryStatus: 'SENT', deliveredAt: new Date() },
      });
    } catch (emailErr) {
      console.error(
        '[notifyLeadCaptured] email transport failed:',
        emailErr instanceof Error ? emailErr.message : String(emailErr)
      );
      await prisma.dealerNotification.update({
        where: { id: notification.id },
        data:  { deliveryStatus: 'FAILED' },
      }).catch(() => {}); // best-effort — don't let update failure cascade
    }
  } catch (err) {
    // Primary operation (lead) already committed. Notification is secondary.
    console.error(
      '[notifyLeadCaptured] notification setup failed:',
      err instanceof Error ? err.message : String(err)
    );
    // Never re-throw.
  }
}
