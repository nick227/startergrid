import type { LeadFormInfo, NormalizedLead } from './leadSyncTypes.js';

const API_BASE = 'https://api.linkedin.com/rest';
const LI_VERSION = '202305';

type RawLeadFormElement = {
  id?: string;
  formName?: string;
  status?: string;
};

type RawFieldValue = { value?: string };

type RawResponseFieldValue = {
  questionId?: string;
  fieldValues?: RawFieldValue[];
};

type RawLeadFormResponseElement = {
  id?: string;
  leadGenForm?: string;
  submittedAt?: number;
  formResponseFieldValues?: RawResponseFieldValue[];
};

function extractFieldValue(
  fields: RawResponseFieldValue[] | undefined,
  questionId: string,
): string | undefined {
  const match = fields?.find(f => f.questionId === questionId);
  return match?.fieldValues?.[0]?.value;
}

export const LinkedInLeadGenClient = {
  async listLeadForms(token: string, accountId: string): Promise<LeadFormInfo[]> {
    const urn = encodeURIComponent(`urn:li:organization:${accountId}`);
    const url = `${API_BASE}/leadGenForms?q=account&account=${urn}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'LinkedIn-Version': LI_VERSION,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      const msg = (body as { message?: string }).message ?? `LinkedIn API ${res.status}`;
      throw new Error(`LinkedIn Lead Gen API ${res.status}: ${msg}`);
    }
    const data = await res.json() as { elements?: RawLeadFormElement[] };
    return (data.elements ?? []).map(el => ({
      urn: el.id ?? '',
      name: el.formName ?? '',
      status: el.status ?? 'UNKNOWN',
    }));
  },

  async getLeadResponses(token: string, formUrn: string, since?: Date): Promise<NormalizedLead[]> {
    const encodedUrn = encodeURIComponent(formUrn);
    const url = `${API_BASE}/leadFormResponses?q=leadGenForm&leadGenForm=${encodedUrn}&count=100`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'LinkedIn-Version': LI_VERSION,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      const msg = (body as { message?: string }).message ?? `LinkedIn API ${res.status}`;
      throw new Error(`LinkedIn Lead Responses API ${res.status}: ${msg}`);
    }
    const data = await res.json() as { elements?: RawLeadFormResponseElement[] };
    const elements = data.elements ?? [];

    const sinceMs = since?.getTime() ?? 0;

    return elements
      .filter(el => (el.submittedAt ?? 0) >= sinceMs)
      .map(el => {
        const fields = el.formResponseFieldValues;
        const firstName = extractFieldValue(fields, 'firstName') ?? '';
        const lastName = extractFieldValue(fields, 'lastName') ?? '';
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || undefined;
        return {
          externalId: el.id,
          submittedAt: el.submittedAt ? new Date(el.submittedAt) : undefined,
          contactName: fullName,
          contactEmail: extractFieldValue(fields, 'emailAddress'),
          contactPhone: extractFieldValue(fields, 'phoneNumber'),
          message: extractFieldValue(fields, 'message'),
          vehicleInterest: el.leadGenForm ? { formUrn: el.leadGenForm } : undefined,
        };
      });
  },
};
