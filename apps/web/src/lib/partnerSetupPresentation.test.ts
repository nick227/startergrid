import { describe, expect, it } from 'vitest';
import {
  dealerFacingMissingLabels,
  isTechnicalField,
  presentSetupSteps,
  presentValidationNote,
  rewriteSetupStep,
} from './partnerSetupPresentation.ts';

describe('presentSetupSteps', () => {
  it('rewrites SFTP and whitelist steps into dealership actions', () => {
    const { dealerSteps, technicalSteps } = presentSetupSteps([
      'Confirm your dealer account is active in the CarGurus Dealer Center.',
      'Contact your CarGurus rep to request inventory ingestion via SFTP.',
      'Ask whether they require an active whitelist for your specific IP or provider.',
      'Enter the assigned SFTP credentials below.',
      'Save to validate credentials.',
      'Confirm with your rep that the feed was accepted and listings are live.',
    ]);

    expect(dealerSteps[0]).toBe('Make sure your dealer account with them is active.');
    expect(dealerSteps.some(step => /inventory updates/.test(step))).toBe(true);
    expect(dealerSteps.some(step => /file-transfer/.test(step))).toBe(true);
    expect(dealerSteps.some(step => /Check connection/.test(step))).toBe(true);
    expect(dealerSteps.every(step => !/sftp|whitelist/i.test(step))).toBe(true);
    expect(technicalSteps.length).toBeGreaterThan(0);
  });
});

describe('presentValidationNote', () => {
  it('keeps technical SFTP notes for support', () => {
    const presented = presentValidationNote(
      'CarGurus requires manual SFTP feed setup. After saving credentials, our system will test the SFTP connection.',
    );
    expect(presented.dealer).toMatch(/not confirmed they received/i);
    expect(presented.technical).toMatch(/SFTP/);
  });
});

describe('isTechnicalField', () => {
  it('treats SFTP secrets as support-only', () => {
    expect(isTechnicalField({ field: 'sftpUsername', label: 'SFTP Username' })).toBe(true);
    expect(isTechnicalField({ field: 'accountId', label: 'Dealer ID' })).toBe(false);
  });
});

describe('dealerFacingMissingLabels', () => {
  it('hides raw SFTP labels from dealers', () => {
    const presented = dealerFacingMissingLabels(['Dealer ID', 'SFTP Password']);
    expect(presented.dealer).toContain('Dealer ID');
    expect(presented.dealer).toContain('Ask support to enter the file-transfer details');
    expect(presented.dealer).not.toContain('SFTP Password');
  });
});

describe('rewriteSetupStep', () => {
  it('leaves already-plain steps alone', () => {
    expect(rewriteSetupStep('Add the dealer ID they assigned to your store.')).toBe(
      'Add the dealer ID they assigned to your store.',
    );
  });

  it('rewrites feed-credential handoff into an outcome', () => {
    expect(rewriteSetupStep('CarGurus provides feed endpoint URL and credentials after approval.')).toMatch(
      /approve your account/,
    );
  });

  it('turns leftover technical steps into a dealer action', () => {
    expect(rewriteSetupStep('Generate the SFTP/XML packet and place it on the host.')).toMatch(/Ask DealerGrid support/);
    expect(rewriteSetupStep('Clicks Connect to start the OAuth flow (uses our system app credentials).')).toMatch(/use Connect/);
    expect(rewriteSetupStep('System generates and delivers the inventory feed to the platform on schedule.')).toMatch(/send ready vehicles/);
    expect(rewriteSetupStep('Obtain the dealer\'s CRM ADF/XML inbound email address from their CRM vendor.')).toMatch(/lead inbox/);
  });
});
