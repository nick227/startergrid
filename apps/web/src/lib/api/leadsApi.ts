export type LeadCrmDeliveryStatus = 'DELIVERED' | 'FAILED' | 'PENDING' | 'READY_TO_EXPORT';

export type LeadDeliveryAttemptItem = {
  id: string;
  destinationType: string;
  destinationLabel: string;
  destinationAddress: string;
  status: string;
  payloadFormat: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  deliveredAt: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type LeadDeliveryDetailsDto = {
  leadId: string;
  deliveryStatus: LeadCrmDeliveryStatus;
  adfXmlPayload: string;
  crmEndpoint: string | null;
  attempts: LeadDeliveryAttemptItem[];
  vehicle: {
    stockNumber: string;
    year?: number | null;
    make?: string | null;
    model?: string | null;
  } | null;
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
};

export async function fetchLeadDeliveryDetails(
  dealershipId: string,
  leadId: string,
): Promise<LeadDeliveryDetailsDto> {
  const res = await fetch(`/api/dealers/${dealershipId}/leads/${leadId}/delivery`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function retryLeadDelivery(
  dealershipId: string,
  leadId: string,
  payload?: { destinationEmail?: string; markDelivered?: boolean },
): Promise<LeadDeliveryDetailsDto> {
  const res = await fetch(`/api/dealers/${dealershipId}/leads/${leadId}/delivery/retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload ?? {}),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}
