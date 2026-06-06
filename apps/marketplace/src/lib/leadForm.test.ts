import { describe, expect, it } from 'vitest';
import {
  EMPTY_LEAD_FORM,
  FORBIDDEN_LEAD_FIELDS,
  assertLeadPayloadBoundary,
  hasLeadFormErrors,
  toLeadPayload,
  validateLeadForm,
} from './leadForm.ts';

describe('validateLeadForm', () => {
  it('requires at least one contact field', () => {
    const errors = validateLeadForm(EMPTY_LEAD_FORM);
    expect(errors.form).toMatch(/name, email, or phone/i);
    expect(hasLeadFormErrors(errors)).toBe(true);
  });

  it('accepts name only', () => {
    const errors = validateLeadForm({ ...EMPTY_LEAD_FORM, contactName: 'Jane Doe' });
    expect(hasLeadFormErrors(errors)).toBe(false);
  });

  it('accepts email only when valid', () => {
    const errors = validateLeadForm({ ...EMPTY_LEAD_FORM, contactEmail: 'jane@example.com' });
    expect(hasLeadFormErrors(errors)).toBe(false);
  });

  it('rejects invalid email', () => {
    const errors = validateLeadForm({ ...EMPTY_LEAD_FORM, contactEmail: 'not-an-email' });
    expect(errors.contactEmail).toBeTruthy();
  });

  it('rejects overly long message', () => {
    const errors = validateLeadForm({ ...EMPTY_LEAD_FORM, contactName: 'Jane', message: 'x'.repeat(5001) });
    expect(errors.message).toBeTruthy();
  });
});

describe('toLeadPayload', () => {
  it('trims values and omits empty fields', () => {
    expect(toLeadPayload({
      contactName: ' Jane ',
      contactEmail: '',
      contactPhone: ' 555-0100 ',
      message: '',
    })).toEqual({
      contactName: 'Jane',
      contactPhone: '555-0100',
    });
  });

  it('never includes forbidden marketplace fields', () => {
    const payload = toLeadPayload({
      ...EMPTY_LEAD_FORM,
      contactName: 'Jane Doe',
      message: 'Interested in this vehicle.',
    });

    for (const field of FORBIDDEN_LEAD_FIELDS) {
      expect(payload).not.toHaveProperty(field);
    }

    expect(() => assertLeadPayloadBoundary(payload as Record<string, unknown>)).not.toThrow();
  });

  it('throws when forbidden fields are injected', () => {
    expect(() => assertLeadPayloadBoundary({
      contactName: 'Jane',
      vin: 'secret',
    })).toThrow(/Forbidden lead field: vin/);
  });
});
