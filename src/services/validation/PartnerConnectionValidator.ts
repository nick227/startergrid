import { validateSftpStub, type ValidatorInput, type ValidatorOutput } from './validators/sftpStubValidator.js';
import { platformProfiles } from '../../data/platformProfiles.js';

export class PartnerConnectionValidator {
  static async validate(input: ValidatorInput): Promise<ValidatorOutput> {
    const profile = platformProfiles.find(p => p.slug === input.platformSlug);
    if (!profile) {
      return { success: false, code: 'UNKNOWN_PLATFORM', safeReason: 'Unknown platform profile.' };
    }

    if (profile.connectionType === 'SFTP') {
      return validateSftpStub(input);
    }

    // Default fallback for unhandled connection types
    return {
      success: false,
      code: 'UNSUPPORTED_CONNECTION_TYPE',
      safeReason: `Validation not supported for connection type: ${profile.connectionType || 'unknown'}`
    };
  }
}
