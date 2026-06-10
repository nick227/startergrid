export type LeadFormInfo = {
  urn: string;
  name: string;
  status: string;
};

export type NormalizedLead = {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  message?: string;
  vehicleInterest?: Record<string, unknown>;
  externalId?: string;
  submittedAt?: Date;
};

export type LeadSyncResult = {
  fetched: number;
  saved: number;
  skipped: number;
};

export interface LeadSyncBridge {
  readonly platformSlug: string;
  readonly oauthProvider: string;
  listLeadForms(token: string, accountId: string): Promise<LeadFormInfo[]>;
  getLeadResponses(token: string, formUrn: string, since?: Date): Promise<NormalizedLead[]>;
}
