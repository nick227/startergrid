/**
 * Dealership Evaluation Intake Service
 * Manages dealership evaluation requests, validates submissions, detects duplicate
 * rooftop inquiries, and provides operational follow-through receipts.
 */

export interface DealershipIntakePayload {
  dealershipName: string;
  contactName: string;
  email: string;
  phone?: string;
  primaryDms: string;
  lotSize: string;
  notes?: string;
}

export interface IntakeReceipt {
  referenceId: string;
  dealershipName: string;
  contactName: string;
  email: string;
  phone?: string;
  primaryDms: string;
  lotSize: string;
  submittedAt: string;
  assignedQueue: string;
  reviewSla: string;
  isDuplicate?: boolean;
}

const STORAGE_KEY = 'startergrid_evaluation_requests';

function normalizeString(s: string): string {
  return s.trim().toLowerCase();
}

export function submitDealershipIntake(payload: DealershipIntakePayload): {
  ok: boolean;
  error?: string;
  receipt?: IntakeReceipt;
} {
  // 1. Validation
  const name = payload.dealershipName.trim();
  const contact = payload.contactName.trim();
  const email = payload.email.trim();

  if (name.length < 2) {
    return { ok: false, error: 'Please enter a valid dealership rooftop name.' };
  }
  if (contact.length < 2) {
    return { ok: false, error: 'Please enter a contact name for your general manager or inventory director.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { ok: false, error: 'Please enter a valid work email address.' };
  }

  // 2. Duplicate Detection
  let existing: IntakeReceipt[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      existing = JSON.parse(raw);
    }
  } catch {
    existing = [];
  }

  const now = new Date();
  const duplicate = existing.find(
    (item) =>
      normalizeString(item.email) === normalizeString(email) ||
      normalizeString(item.dealershipName) === normalizeString(name),
  );

  if (duplicate) {
    return {
      ok: true,
      receipt: {
        ...duplicate,
        isDuplicate: true,
      },
    };
  }

  // 3. Generate Reference ID
  const seed = `${normalizeString(name)}:${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const code = Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
  const referenceId = `REQ-2026-${code}`;

  const receipt: IntakeReceipt = {
    referenceId,
    dealershipName: name,
    contactName: contact,
    email,
    phone: payload.phone?.trim() || undefined,
    primaryDms: payload.primaryDms,
    lotSize: payload.lotSize,
    submittedAt: now.toISOString(),
    assignedQueue: 'Dealership Onboarding & DMS Setup',
    reviewSla: '1 business day',
  };

  try {
    existing.unshift(receipt);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 20)));
  } catch {
    // LocalStorage quota or unavailable in strict sandbox
  }

  return { ok: true, receipt };
}
