import { LinkedInLeadGenClient } from '../LinkedInLeadGenClient.js';
import type { LeadSyncBridge, LeadFormInfo, NormalizedLead } from '../leadSyncTypes.js';

export class LinkedInLeadCaptureBridge implements LeadSyncBridge {
  readonly platformSlug = 'linkedin-lead-gen-forms';
  // Shares the microsoft token row (LinkedIn OAuth uses same Azure AD credentials)
  readonly oauthProvider = 'microsoft';

  async listLeadForms(token: string, accountId: string): Promise<LeadFormInfo[]> {
    return LinkedInLeadGenClient.listLeadForms(token, accountId);
  }

  async getLeadResponses(token: string, formUrn: string, since?: Date): Promise<NormalizedLead[]> {
    return LinkedInLeadGenClient.getLeadResponses(token, formUrn, since);
  }
}
