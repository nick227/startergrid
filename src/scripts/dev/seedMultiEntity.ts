import 'dotenv/config';
import { prisma } from '../../lib/prisma.js';
import { hashPassword } from '../../services/auth/passwordService.js';
import { UX_DEALER_ID } from '../../services/dealership/uxAcceptanceFixture.js';
import { categoryInventorySource } from '../../../packages/category-schemas/src/index.js';
import { assertLocalFixtureEnvironment, FIXTURE_DATE, FIXTURE_PASSWORD, MULTI_ENTITY_BUSINESSES } from './multiEntityFixture.js';
import type { Prisma } from '@prisma/client';

const json = (value: unknown) => value as Prisma.InputJsonValue;

function merchandiseRecord(category: string, item: Record<string, string | number>, index: number) {
  const complete = index === 0;
  if (category === 'APPAREL') {
    return {
      condition: 'VINTAGE',
      listingStatus: complete ? 'READY' as const : 'DRAFT' as const,
      publish: complete,
      primaryIdentifier: String(item.title).slice(0, 12).toUpperCase().replace(/\s+/g, '-'),
      data: {
        title: item.title, brand: item.brand, size: complete ? item.size : '',
        color: complete ? 'Indigo' : 'Charcoal', material: complete ? 'Denim' : 'Wool', era: String(item.year),
      },
    };
  }
  return {
    condition: 'USED',
    listingStatus: complete ? 'READY' as const : 'DRAFT' as const,
    publish: complete,
    primaryIdentifier: String(item.catalogNumber),
    data: {
      title: item.title, artist: complete ? item.artist : '', format: item.format,
      catalogNumber: item.catalogNumber, label: 'Harbor Records',
    },
  };
}
async function main() {
  assertLocalFixtureEnvironment(process.env);
  const reset = process.argv.includes('--reset');
  if (process.argv.slice(2).some(arg => arg !== '--reset')) throw new Error('Only --reset is supported');
  const baseline = await prisma.dealershipProfile.findUnique({ where: { id: UX_DEALER_ID } });
  if (!baseline || baseline.businessCategory !== 'AUTOMOTIVE') throw new Error('Seed the existing Harborline baseline first; this script never changes it.');
  const passwordHash = await hashPassword(FIXTURE_PASSWORD);
  await prisma.$transaction(async tx => {
    for (const business of MULTI_ENTITY_BUSINESSES) {
      const dealerId = `dealer_me_${business.key}`;
      const accountIds = ['owner', 'staff'].map(role => `me_${business.key}_${role}`);
      if (reset) {
        await tx.dealershipProfile.deleteMany({ where: { id: dealerId } });
        await tx.operatorAccount.deleteMany({ where: { id: { in: accountIds } } });
      }
      const email = `owner@${business.key}.multi-entity.example`;
      await tx.dealershipProfile.upsert({ where: { id: dealerId }, update: {}, create: {
        id: dealerId, legalName: `${business.name} Demo LLC`, dbaName: business.name,
        businessCategory: business.category, lifecycleStatus: 'ACTIVE',
        rooftopAddress: json({ street: '100 Demo Harbor', city: 'Austin', state: 'TX', postalCode: '78702', country: 'US' }),
        primaryContact: json({ name: 'Demo Owner', email, phone: '+15125550100' }), primaryContactEmail: email,
        desiredChannels: json(business.category === 'BOATS' ? ['consumer-marketplace'] : []),
        notificationChannels: json({ email: { enabled: false } }), createdAt: FIXTURE_DATE,
      } });
      for (const role of ['owner', 'staff'] as const) {
        const id = `me_${business.key}_${role}`;
        const accessRole = role === 'owner' ? 'DEALER_OWNER' : 'DEALER_STAFF';
        await tx.operatorAccount.upsert({ where: { id }, update: {}, create: {
          id, email: `${role}@${business.key}.multi-entity.example`, passwordHash, role: accessRole,
          firstLoginAt: FIXTURE_DATE, createdAt: FIXTURE_DATE,
        } });
        await tx.operatorDealerAccess.upsert({ where: { operatorAccountId_dealershipId: { operatorAccountId: id, dealershipId: dealerId } }, update: {}, create: {
          id: `${id}_access`, operatorAccountId: id, dealershipId: dealerId, accessRole, grantedBy: 'multi-entity-fixture', grantedAt: FIXTURE_DATE,
        } });
      }
      for (const [index, spec] of business.items.entries()) {
        const item = spec as Record<string, string | number>;
        const id = `me_${business.key}_${index + 1}`;
        const stockNumber = `ME-${business.key.toUpperCase()}-${index + 1}`;
        const vehicleStock = categoryInventorySource(business.category) === 'vehicle';
        if (vehicleStock) {
          await tx.vehicle.upsert({ where: { id }, update: {}, create: {
            id, dealershipId: dealerId, stockNumber, vin: String(item.hin ?? stockNumber),
            year: Number(item.year), make: String(item.make ?? item.brand), model: String(item.title),
            trim: item.size ? String(item.size) : null, mileage: Number(item.hours ?? 0), priceCents: Number(item.priceCents),
            condition: 'USED', exteriorColor: business.category === 'BOATS' ? 'White' : 'Blue',
            options: json([]), starCore: json({}), categoryPayload: json(business.category === 'BOATS' ? { vesselType: 'Center Console' } : {}),
            listingStatus: business.category === 'BOATS' ? 'READY' : 'DRAFT', createdAt: FIXTURE_DATE,
          } });
          await tx.vehicleMedia.upsert({ where: { id: `${id}_image` }, update: {}, create: {
            id: `${id}_image`, vehicleId: id, url: `/demo-assets/multi-entity-${business.key}.svg`, kind: 'IMAGE', sortOrder: 0,
          } });
          if (business.category === 'BOATS') {
            await tx.marketplaceListing.upsert({ where: { vehicleId_platformSlug: { vehicleId: id, platformSlug: 'consumer-marketplace' } }, update: {}, create: {
              id: `${id}_listing`, dealershipId: dealerId, vehicleId: id, platformSlug: 'consumer-marketplace', status: 'ACTIVE', listedAt: FIXTURE_DATE,
            } });
          }
        } else if (business.category === 'APPAREL' || business.category === 'SONGS') {
          const merchandise = merchandiseRecord(business.category, item, index);
          await tx.categoryInventoryItem.upsert({ where: { id }, update: {}, create: {
            id, dealershipId: dealerId, categoryId: business.category, stockNumber,
            primaryIdentifier: merchandise.primaryIdentifier, priceCents: Number(item.priceCents),
            condition: merchandise.condition, listingStatus: merchandise.listingStatus,
            data: json(merchandise.data), createdAt: FIXTURE_DATE,
          } });
          await tx.categoryInventoryItemMedia.upsert({ where: { id: `${id}_image` }, update: {}, create: {
            id: `${id}_image`, itemId: id, url: `/demo-assets/multi-entity-${business.key}.svg`, kind: 'IMAGE', sortOrder: 0,
          } });
          if (merchandise.publish) {
            await tx.marketplaceListing.upsert({ where: { categoryItemId_platformSlug: { categoryItemId: id, platformSlug: 'consumer-marketplace' } }, update: {}, create: {
              id: `${id}_listing`, dealershipId: dealerId, categoryItemId: id, platformSlug: 'consumer-marketplace', status: 'ACTIVE', listedAt: FIXTURE_DATE,
            } });
          }
        } else {
          // Physical books stay private. They are not digital ebooks.
          await tx.categoryInventoryItem.upsert({ where: { id }, update: {}, create: {
            id, dealershipId: dealerId, categoryId: business.category, stockNumber,
            primaryIdentifier: String(item.isbn ?? item.catalogNumber), priceCents: Number(item.priceCents), condition: 'USED',
            listingStatus: 'DRAFT', data: json({ ...item, fixtureContractGap: 'Physical books are not the digital ebook contract.' }), createdAt: FIXTURE_DATE,
          } });
          await tx.categoryInventoryItemMedia.upsert({ where: { id: `${id}_image` }, update: {}, create: {
            id: `${id}_image`, itemId: id, url: `/demo-assets/multi-entity-${business.key}.svg`, kind: 'IMAGE', sortOrder: 0,
          } });
        }
      }
      if (business.category === 'EBOOKS') {
        // A separate, valid digital control. Never relabel or publish the physical book drafts.
        const id = 'me_books_digital_1';
        await tx.categoryInventoryItem.upsert({ where: { id }, update: {}, create: {
          id, dealershipId: dealerId, categoryId: 'EBOOKS', stockNumber: 'ME-DIGITAL-001', primaryIdentifier: 'ME-DIGITAL-001',
          priceCents: 500, condition: 'DIGITAL', listingStatus: 'READY',
          data: json({ title: 'Harbor Field Notes — Digital Demo', author: 'DealerGrid Demo', publisher: 'Harbor Books', format: 'epub' }), createdAt: FIXTURE_DATE,
        } });
        await tx.categoryInventoryItemMedia.upsert({ where: { id: `${id}_image` }, update: {}, create: {
          id: `${id}_image`, itemId: id, url: '/demo-assets/multi-entity-books.svg', kind: 'IMAGE', sortOrder: 0, mediaSlotKey: 'cover',
        } });
        await tx.marketplaceListing.upsert({ where: { categoryItemId_platformSlug: { categoryItemId: id, platformSlug: 'consumer-marketplace' } }, update: {}, create: {
          id: `${id}_listing`, dealershipId: dealerId, categoryItemId: id, platformSlug: 'consumer-marketplace', status: 'ACTIVE', listedAt: FIXTURE_DATE,
        } });
      }
      if (business.category === 'BOATS' || business.category === 'EBOOKS' || business.category === 'APPAREL' || business.category === 'SONGS') await tx.platformAccount.upsert({ where: { dealershipId_platformSlug: { dealershipId: dealerId, platformSlug: 'consumer-marketplace' } }, update: {}, create: {
        dealershipId: dealerId, platformSlug: 'consumer-marketplace', state: 'ACTIVE', dealerEnabled: true, connectionConfig: json({}),
      } });
      await tx.teamThread.upsert({ where: { id: `me_${business.key}_task` }, update: {}, create: {
        id: `me_${business.key}_task`, dealershipId: dealerId, kind: 'TASK', title: 'Review demo inventory',
        body: 'Verify inventory and record acceptance gaps. This task is fixture data, not a captured inquiry.',
        authorId: accountIds[0]!, authorEmail: email, assigneeId: accountIds[1]!, reference: `#/${dealerId}/inventory`, createdAt: FIXTURE_DATE,
      } });
    }
  }, { timeout: 30000 });
  console.log('Harborline preserved; four isolated demo businesses ready. See docs/multi-entity/phase-1.md.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
