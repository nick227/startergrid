import type { Prisma, PrismaClient } from '@prisma/client';
import { hashPassword } from '../auth/passwordService.js';
import { UX_DEALER_ID, UX_DEALER_PASSWORD, UX_PEOPLE, UX_VEHICLES, uxDaysAgo, type UxVehicleSpec } from './uxAcceptanceFixture.js';

export { UX_DEALER_ID, UX_DEALER_PASSWORD };

const json = (value: unknown) => value as Prisma.InputJsonValue;

const ago = uxDaysAgo;

async function ensurePerson(prisma: PrismaClient, dealerId: string, person: (typeof UX_PEOPLE)[number]): Promise<string> {
  const existing = await prisma.operatorAccount.findUnique({ where: { email: person.email }, select: { id: true } });
  const account = existing ?? await prisma.operatorAccount.create({
    data: {
      email: person.email,
      passwordHash: await hashPassword(UX_DEALER_PASSWORD),
      role: person.role,
      firstLoginAt: ago(20),
      lastLoginAt: ago(1),
    },
    select: { id: true },
  });
  await prisma.operatorDealerAccess.upsert({
    where: { operatorAccountId_dealershipId: { operatorAccountId: account.id, dealershipId: dealerId } },
    update: { accessRole: person.access },
    create: { operatorAccountId: account.id, dealershipId: dealerId, accessRole: person.access, grantedBy: 'ux-acceptance-seed' },
  });
  return account.id;
}

async function ensureVehicle(prisma: PrismaClient, dealerId: string, spec: UxVehicleSpec): Promise<void> {
  const data = {
    vin: spec.vin, year: spec.year, make: spec.make, model: spec.model, trim: spec.trim,
    mileage: spec.mileage, priceCents: spec.priceCents, condition: 'USED', exteriorColor: spec.exteriorColor,
    interiorColor: 'Black', bodyStyle: spec.bodyStyle, drivetrain: 'AWD', fuelType: 'Gasoline', transmission: 'Automatic',
    listingStatus: spec.listingStatus, soldAt: spec.soldAt, removedAt: null,
  };
  await prisma.vehicle.upsert({
    where: { dealershipId_stockNumber: { dealershipId: dealerId, stockNumber: spec.stockNumber } },
    update: data,
    create: { id: spec.id, dealershipId: dealerId, stockNumber: spec.stockNumber, ...data, options: json([]), starCore: json({}), createdAt: ago(spec.soldAt ? 28 : 12) },
  });
  await prisma.vehicleMedia.deleteMany({ where: { vehicleId: spec.id } });
  if (!spec.photos) return;
  await prisma.vehicleMedia.createMany({
    data: ['front', 'odometer'].map((mediaSlotKey, sortOrder) => ({
      vehicleId: spec.id, url: '/demo-assets/suv-white.svg', kind: 'IMAGE' as const, sortOrder, width: 800, height: 600, mimeType: 'image/svg+xml', mediaSlotKey, mediaRole: 'STRUCTURED_SHOT' as const,
    })),
  });
}

export async function seedUxAcceptanceDealership(prisma: PrismaClient): Promise<string> {
  const dealerId = UX_DEALER_ID;
  await prisma.dealershipProfile.upsert({
    where: { id: dealerId },
    update: { legalName: 'Harborline Motors Demo LLC', dbaName: 'Harborline Motors (demo)', lifecycleStatus: 'ACTIVE' },
    create: {
      id: dealerId,
      legalName: 'Harborline Motors Demo LLC',
      dbaName: 'Harborline Motors (demo)',
      businessCategory: 'AUTOMOTIVE',
      dealerLicense: 'DEMO-HLM-4100',
      rooftopAddress: json({ street: '410 Harbor Ave', city: 'Austin', state: 'TX', postalCode: '78702', country: 'US' }),
      websiteUrl: 'https://harborline-demo.example',
      primaryContact: json({ name: 'Elena Vasquez', email: 'elena@harborline.example.com', phone: '+15125554100' }),
      primaryContactEmail: 'elena@harborline.example.com',
      notificationChannels: json({ email: { enabled: true } }),
      inventorySize: 4,
      desiredChannels: json(['consumer-marketplace', 'cars-com', 'google-vehicle-ads']),
      lifecycleStatus: 'ACTIVE',
      launchCompletedAt: ago(30),
      handoffCompletedAt: ago(21),
    },
  });

  const ownerId = await ensurePerson(prisma, dealerId, UX_PEOPLE[0]!);
  const priyaId = await ensurePerson(prisma, dealerId, UX_PEOPLE[1]!);
  await ensurePerson(prisma, dealerId, UX_PEOPLE[2]!);
  await prisma.operatorDealerAccess.deleteMany({ where: { dealershipId: dealerId, grantedBy: { not: 'ux-acceptance-seed' }, operator: { email: { notIn: UX_PEOPLE.map(person => person.email) } } } });

  await prisma.lead.deleteMany({ where: { dealershipId: dealerId, id: { notIn: ['lead_ux_maya', 'lead_ux_sam', 'lead_ux_lost'] } } });
  await prisma.vehicleLifecycleEvent.deleteMany({ where: { dealershipId: dealerId, id: { not: 'life_ux_f150' } } });
  await prisma.vehicleUpdate.deleteMany({ where: { dealershipId: dealerId, id: { not: 'upd_ux_crv_price' } } });
  await prisma.publishQueueItem.deleteMany({ where: { dealershipId: dealerId, idempotencyKey: { not: 'ux-acceptance-rav4-google-failed' } } });
  await prisma.vehicle.deleteMany({ where: { dealershipId: dealerId, stockNumber: { notIn: UX_VEHICLES.map(vehicle => vehicle.stockNumber) } } });
  for (const vehicle of UX_VEHICLES) await ensureVehicle(prisma, dealerId, vehicle);
  await prisma.vehicleSaleRecord.deleteMany({ where: { vehicleId: 'veh_ux_crv' } });

  const channels = [
    ['consumer-marketplace', 'ACTIVE'],
    ['cars-com', 'ACTIVE'],
    ['google-vehicle-ads', 'FAILED'],
  ] as const;
  for (const [platformSlug, state] of channels) {
    await prisma.platformAccount.upsert({
      where: { dealershipId_platformSlug: { dealershipId: dealerId, platformSlug } },
      update: { state, dealerEnabled: true, ...(platformSlug === 'cars-com' ? { accountId: 'DEMO-HLM-4100' } : {}) },
      create: { dealershipId: dealerId, platformSlug, state, dealerEnabled: true, connectionConfig: json({}), ...(platformSlug === 'cars-com' ? { accountId: 'DEMO-HLM-4100' } : {}) },
    });
  }

  for (const vehicleId of ['veh_ux_crv', 'veh_ux_rav4']) {
    await prisma.marketplaceListing.upsert({
      where: { vehicleId_platformSlug: { vehicleId, platformSlug: 'consumer-marketplace' } },
      update: { status: 'ACTIVE' },
      create: { id: `mp_${vehicleId}`, dealershipId: dealerId, vehicleId, platformSlug: 'consumer-marketplace', status: 'ACTIVE', listedAt: ago(11) },
    });
  }

  const failureReason = 'Demo rejection: Google Vehicle Ads could not verify the rooftop address.';
  await prisma.publishQueueItem.upsert({
    where: { idempotencyKey: 'ux-acceptance-rav4-google-failed' },
    update: { id: 'queue_ux_rav4_google', status: 'FAILED', failureReason, vehicleId: 'veh_ux_rav4', rejectedAt: null, rejectionReason: null },
    create: {
      id: 'queue_ux_rav4_google',
      dealershipId: dealerId, vehicleId: 'veh_ux_rav4', platformSlug: 'google-vehicle-ads', triggerKind: 'INITIAL_PUBLISH',
      status: 'FAILED', policyMode: 'SCHEDULED', idempotencyKey: 'ux-acceptance-rav4-google-failed',
      failureReason, attemptCount: 3, createdAt: ago(2, 9),
    },
  });

  await prisma.lead.upsert({
    where: { id: 'lead_ux_maya' },
    update: { workflowStatus: 'NEW', assigneeOperatorId: null, notes: null, vehicleId: 'veh_ux_crv' },
    create: { id: 'lead_ux_maya', dealershipId: dealerId, vehicleId: 'veh_ux_crv', source: 'PLATFORM_FORM', platformSlug: 'cars-com', contactName: 'Maya Chen', contactEmail: 'maya.chen@example.com', contactPhone: '+15125554121', message: 'Is the CR-V still available for a Saturday test drive?', workflowStatus: 'NEW', createdAt: ago(1, 8) },
  });
  await prisma.lead.upsert({
    where: { id: 'lead_ux_sam' },
    update: { workflowStatus: 'CONTACTED', assigneeOperatorId: priyaId, vehicleId: 'veh_ux_rav4' },
    create: { id: 'lead_ux_sam', dealershipId: dealerId, vehicleId: 'veh_ux_rav4', source: 'DEALER_STOREFRONT', platformSlug: 'consumer-marketplace', contactName: 'Sam Okonkwo', contactEmail: 'sam.okonkwo@example.com', message: 'Asking about the RAV4. I left a voicemail.', workflowStatus: 'CONTACTED', assigneeOperatorId: priyaId, createdAt: ago(4, 14) },
  });
  await prisma.lead.upsert({
    where: { id: 'lead_ux_lost' },
    update: { workflowStatus: 'LOST', vehicleId: 'veh_ux_f150' },
    create: { id: 'lead_ux_lost', dealershipId: dealerId, vehicleId: 'veh_ux_f150', source: 'MANUAL', platformSlug: 'cars-com', contactName: 'Chris Dalton', contactEmail: 'chris.dalton@example.com', message: 'Bought elsewhere.', workflowStatus: 'LOST', createdAt: ago(9, 11) },
  });

  const sync = [
    { id: 'sync_ux_sent', kind: 'SUBMISSION_SENT' as const, platformSlug: 'cars-com', vehicleId: 'veh_ux_crv', createdAt: ago(3, 15), payload: json({ uxAcceptanceSeed: true }) },
    { id: 'sync_ux_failed', kind: 'DISPATCH_FAILED' as const, platformSlug: 'google-vehicle-ads', vehicleId: 'veh_ux_rav4', createdAt: ago(2, 9), payload: json({ uxAcceptanceSeed: true, queueItemId: 'queue_ux_rav4_google', failureReason }) },
  ];
  await prisma.syncEvent.deleteMany({ where: { dealershipId: dealerId, id: { notIn: sync.map(row => row.id) } } });
  for (const row of sync) {
    await prisma.syncEvent.upsert({
      where: { id: row.id },
      update: { kind: row.kind, createdAt: row.createdAt, payload: row.payload },
      create: { ...row, dealershipId: dealerId },
    });
  }

  await prisma.vehicleLifecycleEvent.upsert({
    where: { id: 'life_ux_f150' },
    update: { toState: 'SOLD', statusChangedAt: ago(6, 16) },
    create: { id: 'life_ux_f150', vehicleId: 'veh_ux_f150', dealershipId: dealerId, fromState: 'READY', toState: 'SOLD', triggerKind: 'MARK_SOLD', source: 'OPERATOR', statusChangedAt: ago(6, 16), createdAt: ago(6, 16) },
  });
  await prisma.vehicleUpdate.upsert({
    where: { id: 'upd_ux_crv_price' },
    update: {},
    create: { id: 'upd_ux_crv_price', vehicleId: 'veh_ux_crv', dealershipId: dealerId, kind: 'PRICE_CHANGE', previousValue: json({ priceCents: 2999500 }), newValue: json({ priceCents: 2899500 }), createdAt: ago(5, 13) },
  });
  await prisma.vehicleSaleRecord.upsert({
    where: { vehicleId: 'veh_ux_f150' },
    update: { salePriceCents: 3320000, transactionDate: ago(6, 16), confirmedChannelSlug: 'cars-com' },
    create: { vehicleId: 'veh_ux_f150', dealershipId: dealerId, salePriceCents: 3320000, transactionDate: ago(6, 16), confirmedChannelSlug: 'cars-com', sourceConfidence: 'MANUAL_IMPORTED', recordedBy: ownerId },
  });

  const tasks = [
    { id: 'task_ux_photos', title: 'Photograph the Equinox', body: 'The draft Equinox has no photos. Shoot the lot set before it can be published.', assigneeId: priyaId, completedAt: null, reference: `#/${dealerId}/inventory?assetId=veh_ux_draft` },
    { id: 'task_ux_call', title: 'Call Maya Chen about the CR-V', body: 'She asked for a Saturday test drive. Confirm a time and record it on the inquiry.', assigneeId: null, completedAt: null, reference: `#/${dealerId}/activity/leads?leadId=lead_ux_maya` },
    { id: 'task_ux_done', title: 'File the F-150 sale paperwork', body: 'The F-150 sale is recorded. File the buyer packet.', assigneeId: ownerId, completedAt: ago(5, 17), reference: `#/${dealerId}/activity/sales` },
  ];
  await prisma.teamThread.deleteMany({ where: { dealershipId: dealerId, id: { notIn: [...tasks.map(task => task.id), 'thread_ux_coverage'] } } });
  for (const task of tasks) {
    await prisma.teamThread.upsert({
      where: { id: task.id },
      update: { assigneeId: task.assigneeId, completedAt: task.completedAt, title: task.title, body: task.body },
      create: { ...task, dealershipId: dealerId, kind: 'TASK', authorId: ownerId, authorEmail: UX_PEOPLE[0]!.email, createdAt: ago(3) },
    });
  }
  await prisma.teamThread.upsert({
    where: { id: 'thread_ux_coverage' },
    update: {},
    create: { id: 'thread_ux_coverage', dealershipId: dealerId, kind: 'POST', title: 'Saturday coverage', body: 'Priya has the CR-V test drive. Jordan covers the phone until noon.', authorId: ownerId, authorEmail: UX_PEOPLE[0]!.email, createdAt: ago(2, 18) },
  });
  await prisma.teamComment.upsert({
    where: { id: 'comment_ux_coverage' },
    update: {},
    create: { id: 'comment_ux_coverage', threadId: 'thread_ux_coverage', authorId: priyaId, authorEmail: UX_PEOPLE[1]!.email, body: 'I can stay until 1 if the test drive runs long.', createdAt: ago(2, 19) },
  });

  const route = await prisma.inboundEmailRoute.findFirst({ where: { dealershipId: dealerId, status: 'ACTIVE' }, select: { id: true } });
  if (!route) {
    await prisma.inboundEmailRoute.create({ data: { dealershipId: dealerId, routeToken: 'uxharborlinedemo01', status: 'ACTIVE' } });
  }

  return dealerId;
}
