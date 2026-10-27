import { describe, expect, it } from 'vitest';
import { publicationStatusText, vehicleReadinessText } from './listingStatus.ts';

describe('vehicleReadinessText', () => {
  it('uses dealership language instead of READY', () => {
    expect(vehicleReadinessText('READY')).toBe('Ready to send');
    expect(vehicleReadinessText('WARNING')).toBe('Needs details');
    expect(vehicleReadinessText('BLOCKED')).toBe('Cannot list');
  });
});

describe('publicationStatusText', () => {
  it('does not reuse readiness words', () => {
    expect(publicationStatusText(0)).toBe('Not sent yet');
    expect(publicationStatusText(3)).toBe('Sent');
  });
});
