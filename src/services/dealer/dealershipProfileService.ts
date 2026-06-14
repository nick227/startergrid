import type { Prisma, PrismaClient } from '@prisma/client';
import type { UpdateDealershipProfileBody } from '../../server/requestValidation.js';
import type { NotificationChannelsConfig } from './notificationFanout.js';

export type DealershipAddress = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
};

export type DealershipContact = {
  name: string;
  email: string;
  phone?: string | null;
  role?: string | null;
};

export type NotificationChannelSummary = {
  email: { enabled: boolean };
  webhook: { configured: boolean };
  discord: { configured: boolean };
  telegram: { configured: boolean };
  sms: { configured: boolean };
  autoResponse: { enabled: boolean };
};

export type ProfileReadinessWarning = {
  field: string;
  label: string;
  severity: 'warning' | 'critical';
  message: string;
};

export type DealershipProfileResponse = {
  id: string;
  legalName: string;
  dbaName: string | null;
  businessCategory: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  dealerLicense: string | null;
  primaryContact: DealershipContact;
  rooftopAddress: DealershipAddress;
  notificationChannels: NotificationChannelSummary;
  publishingWarnings: ProfileReadinessWarning[];
  createdAt: string;
  updatedAt: string;
};

const PROFILE_SELECT = {
  id: true,
  legalName: true,
  dbaName: true,
  businessCategory: true,
  websiteUrl: true,
  logoUrl: true,
  dealerLicense: true,
  primaryContact: true,
  rooftopAddress: true,
  notificationChannels: true,
  createdAt: true,
  updatedAt: true,
} as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeRooftopAddress(raw: unknown): DealershipAddress {
  if (!raw || typeof raw !== 'object') {
    return { street: '', city: '', state: '', postalCode: '', country: 'US' };
  }
  const o = asRecord(raw);
  return {
    street: asString(o['street']),
    city: asString(o['city']),
    state: asString(o['state']),
    postalCode: asString(o['postalCode']),
    country: asString(o['country']) || 'US',
  };
}

export function normalizePrimaryContact(raw: unknown): DealershipContact {
  if (!raw || typeof raw !== 'object') {
    return { name: '', email: '', phone: null, role: null };
  }
  const o = asRecord(raw);
  return {
    name: asString(o['name']),
    email: asString(o['email']),
    phone: asString(o['phone']) || null,
    role: asString(o['role']) || null,
  };
}

export function summarizeNotificationChannels(raw: unknown): NotificationChannelSummary {
  const channels = asRecord(raw) as NotificationChannelsConfig;
  return {
    email: { enabled: channels.email?.enabled !== false },
    webhook: { configured: Boolean(channels.webhook?.url?.trim()) },
    discord: { configured: Boolean(channels.discord?.webhookUrl?.trim()) },
    telegram: {
      configured: Boolean(channels.telegram?.botToken?.trim() && channels.telegram?.chatId?.trim()),
    },
    sms: { configured: Boolean(channels.sms?.phone?.trim()) },
    autoResponse: { enabled: channels.autoResponse?.enabled === true },
  };
}

export function computePublishingWarnings(profile: {
  websiteUrl: string | null;
  primaryContact: DealershipContact;
  rooftopAddress: DealershipAddress;
}): ProfileReadinessWarning[] {
  const warnings: ProfileReadinessWarning[] = [];

  if (!profile.websiteUrl?.trim()) {
    warnings.push({
      field: 'websiteUrl',
      label: 'Website URL',
      severity: 'critical',
      message: 'Most platforms require a dealership website before publishing inventory.',
    });
  } else if (!profile.websiteUrl.startsWith('https://')) {
    warnings.push({
      field: 'websiteUrl',
      label: 'Website URL',
      severity: 'warning',
      message: 'Use HTTPS for your website — some platforms reject HTTP storefront links.',
    });
  }

  if (!profile.primaryContact.email?.trim()) {
    warnings.push({
      field: 'primaryContact.email',
      label: 'Contact email',
      severity: 'critical',
      message: 'A public contact email is required for marketplace leads and platform setup.',
    });
  }

  if (!profile.primaryContact.phone?.trim()) {
    warnings.push({
      field: 'primaryContact.phone',
      label: 'Contact phone',
      severity: 'warning',
      message: 'Add a phone number so buyers and platforms can reach your rooftop.',
    });
  }

  for (const [key, label] of [
    ['street', 'Street address'],
    ['city', 'City'],
    ['state', 'State'],
    ['postalCode', 'Postal code'],
  ] as const) {
    if (!profile.rooftopAddress[key]?.trim()) {
      warnings.push({
        field: `rooftopAddress.${key}`,
        label,
        severity: 'warning',
        message: `${label} helps marketplace buyers and feed destinations verify your location.`,
      });
    }
  }

  return warnings;
}

function shapeProfile(row: {
  id: string;
  legalName: string;
  dbaName: string | null;
  businessCategory: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  dealerLicense: string | null;
  primaryContact: unknown;
  rooftopAddress: unknown;
  notificationChannels: unknown;
  createdAt: Date;
  updatedAt: Date;
}): DealershipProfileResponse {
  const primaryContact = normalizePrimaryContact(row.primaryContact);
  const rooftopAddress = normalizeRooftopAddress(row.rooftopAddress);
  return {
    id: row.id,
    legalName: row.legalName,
    dbaName: row.dbaName,
    businessCategory: row.businessCategory,
    websiteUrl: row.websiteUrl,
    logoUrl: row.logoUrl,
    dealerLicense: row.dealerLicense,
    primaryContact,
    rooftopAddress,
    notificationChannels: summarizeNotificationChannels(row.notificationChannels),
    publishingWarnings: computePublishingWarnings({
      websiteUrl: row.websiteUrl,
      primaryContact,
      rooftopAddress,
    }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getDealershipProfile(
  prisma: PrismaClient,
  dealershipId: string,
): Promise<DealershipProfileResponse | null> {
  const row = await prisma.dealershipProfile.findUnique({
    where: { id: dealershipId },
    select: PROFILE_SELECT,
  });
  if (!row) return null;
  return shapeProfile(row);
}

function mergeContact(existing: DealershipContact, patch?: UpdateDealershipProfileBody['primaryContact']): DealershipContact {
  if (!patch) return existing;
  return {
    name: patch.name ?? existing.name,
    email: patch.email ?? existing.email,
    phone: patch.phone !== undefined ? (patch.phone?.trim() || null) : existing.phone,
    role: patch.role !== undefined ? (patch.role?.trim() || null) : existing.role,
  };
}

function mergeAddress(existing: DealershipAddress, patch?: UpdateDealershipProfileBody['rooftopAddress']): DealershipAddress {
  if (!patch) return existing;
  return {
    street: patch.street ?? existing.street,
    city: patch.city ?? existing.city,
    state: patch.state ?? existing.state,
    postalCode: patch.postalCode ?? existing.postalCode,
    country: patch.country ?? existing.country ?? 'US',
  };
}

export async function updateDealershipProfile(
  prisma: PrismaClient,
  dealershipId: string,
  body: UpdateDealershipProfileBody,
): Promise<DealershipProfileResponse | null> {
  const current = await prisma.dealershipProfile.findUnique({
    where: { id: dealershipId },
    select: PROFILE_SELECT,
  });
  if (!current) return null;

  const existingContact = normalizePrimaryContact(current.primaryContact);
  const existingAddress = normalizeRooftopAddress(current.rooftopAddress);
  const mergedContact = mergeContact(existingContact, body.primaryContact);
  const mergedAddress = mergeAddress(existingAddress, body.rooftopAddress);

  const data: Prisma.DealershipProfileUpdateInput = {};

  if (body.legalName !== undefined) data.legalName = body.legalName;
  if (body.dbaName !== undefined) data.dbaName = body.dbaName?.trim() || null;
  if (body.websiteUrl !== undefined) {
    data.websiteUrl = body.websiteUrl?.trim() || null;
  }
  if (body.primaryContact !== undefined) {
    data.primaryContact = mergedContact as unknown as Prisma.InputJsonValue;
  }
  if (body.rooftopAddress !== undefined) {
    data.rooftopAddress = mergedAddress as unknown as Prisma.InputJsonValue;
  }

  const updated = await prisma.dealershipProfile.update({
    where: { id: dealershipId },
    data,
    select: PROFILE_SELECT,
  });

  return shapeProfile(updated);
}
