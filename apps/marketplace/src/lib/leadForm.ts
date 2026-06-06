export type LeadFormValues = {
  contactName:  string;
  contactEmail: string;
  contactPhone: string;
  message:      string;
};

export type LeadFormErrors = Partial<Record<keyof LeadFormValues | 'form', string>>;

export const EMPTY_LEAD_FORM: LeadFormValues = {
  contactName:  '',
  contactEmail: '',
  contactPhone: '',
  message:      '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Fields that must never be sent from the public marketplace form. */
export const FORBIDDEN_LEAD_FIELDS = [
  'vin',
  'stockNumber',
  'dealerId',
  'listingId',
  'vehicleId',
  'readinessScore',
  'performanceCache',
  'platformSlug',
] as const;

export function validateLeadForm(values: LeadFormValues): LeadFormErrors {
  const errors: LeadFormErrors = {};
  const name = values.contactName.trim();
  const email = values.contactEmail.trim();
  const phone = values.contactPhone.trim();
  const message = values.message.trim();

  if (!name && !email && !phone) {
    errors.form = 'Enter your name, email, or phone number.';
  }

  if (email && !EMAIL_PATTERN.test(email)) {
    errors.contactEmail = 'Enter a valid email address.';
  }

  if (phone.length > 40) {
    errors.contactPhone = 'Phone number is too long.';
  }

  if (name.length > 160) {
    errors.contactName = 'Name is too long.';
  }

  if (message.length > 5000) {
    errors.message = 'Message is too long.';
  }

  return errors;
}

export function hasLeadFormErrors(errors: LeadFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function toLeadPayload(values: LeadFormValues): {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  message?: string;
} {
  const payload: {
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    message?: string;
  } = {};

  const name = values.contactName.trim();
  const email = values.contactEmail.trim();
  const phone = values.contactPhone.trim();
  const message = values.message.trim();

  if (name) payload.contactName = name;
  if (email) payload.contactEmail = email;
  if (phone) payload.contactPhone = phone;
  if (message) payload.message = message;

  return payload;
}

export function assertLeadPayloadBoundary(payload: Record<string, unknown>): void {
  for (const key of FORBIDDEN_LEAD_FIELDS) {
    if (key in payload) {
      throw new Error(`Forbidden lead field: ${key}`);
    }
  }
}
