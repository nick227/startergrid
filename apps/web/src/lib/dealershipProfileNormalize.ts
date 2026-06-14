import type { DealershipAddressInput, DealershipContactInput } from '@/lib/types.ts';

export function normalizePrimaryContact(value: unknown): DealershipContactInput {
  if (!value || typeof value !== 'object') {
    return { name: '', email: '', phone: '' };
  }

  const contact = value as Partial<{ name: string; email: string; phone: string; role: string }>;

  return {
    name: contact.name ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    role: contact.role ?? undefined,
  };
}

export function normalizeRooftopAddress(value: unknown): DealershipAddressInput {
  if (!value || typeof value !== 'object') {
    return { street: '', city: '', state: '', postalCode: '', country: 'US' };
  }

  const address = value as Partial<DealershipAddressInput>;

  return {
    street: address.street ?? '',
    city: address.city ?? '',
    state: address.state ?? '',
    postalCode: address.postalCode ?? '',
    country: address.country ?? 'US',
  };
}

export function formatMemberSince(createdAt: string | null | undefined): string {
  if (!createdAt) return 'Unknown';
  return new Date(createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}
